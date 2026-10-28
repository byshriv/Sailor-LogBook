import { expect, test } from '@playwright/test';
const base = '/@fs/' + process.cwd().replaceAll('\\', '/') + '/';

test('Phase 2 composed Redux preview saves, restores after restart and leaves slb1 intact', async ({
  page,
  context,
}) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('slb1')) localStorage.setItem('slb1', 'synthetic-legacy-sentinel');
  });
  await page.goto('/?phase=2');
  await page.getByLabel('Synthetic activity title').fill('Recoverable sample');
  await page.getByRole('button', { name: 'Save activity locally' }).click();
  await expect(page.getByRole('status')).toContainText('Saved locally');
  await page.getByRole('button', { name: 'Delete Recoverable sample' }).click();
  await expect(page.getByRole('button', { name: 'Undo deletion' })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Undo deletion' }).click();
  await expect(page.getByRole('listitem')).toContainText('Recoverable sample');
  const second = await context.newPage();
  await second.goto('/?phase=2');
  await expect(second.getByRole('status')).toContainText('Another Phase 2 preview tab is active');
  await second.close();
  expect(await page.evaluate(() => localStorage.getItem('slb1'))).toBe('synthetic-legacy-sentinel');
});

test('Phase 2 real IndexedDB migration, restart, replay and acknowledged checkpoint', async ({
  page,
}) => {
  await page.goto('/');
  const paths = {
    persistence: base + 'packages/persistence/src/logbook.ts',
    migration: base + 'packages/persistence/src/migration.ts',
  };
  const result = await page.evaluate(async (paths) => {
    const { openLogbook } = await import(paths.persistence);
    const { previewV8, migrateV8 } = await import(paths.migration);
    let db = await openLogbook(indexedDB, 'phase2-browser', 'browser-actor');
    const raw = JSON.stringify({
      entries: [
        { id: 'night', t: 'Synthetic midnight', date: '2026-10-28', s: 1380, e: 1500, d: null },
      ],
      docks: [],
      pre: [{ t: 'Duration free', dur: 0 }],
      extra: { retained: true },
    });
    const plan = await previewV8(raw, {
      maxSourceBytes: 10000,
      maxAttachmentBytes: 10000,
      exclusion: {},
    });
    await migrateV8(db, plan, 'browser', async (_raw: string, digest: string) => digest);
    await db.commit({ id: 'delete', at: 1, edit: { type: 'delete', keys: ['activity:night'] } });
    const pending = (await db.pending()).length;
    const beforeAck = await db.checkpoint();
    await db.acknowledge(['delete']);
    await db.checkpoint();
    db.close();
    db = await openLogbook(indexedDB, 'phase2-browser', 'ignored-new-actor');
    await db.commit({ id: 'restore', at: 2, edit: { type: 'restore', deletion: 'delete' } });
    const state = await db.load();
    const actor = await db.actor();
    db.close();
    return {
      raw: state.archive.raw,
      expected: raw,
      segments: state.entities['activity:night'].segments.length,
      pending,
      beforeAck,
      actor,
    };
  }, paths);
  expect(result.raw).toBe(result.expected);
  expect(result.segments).toBe(2);
  expect(result.pending).toBe(1);
  expect(result.beforeAck.revision).toBe(0);
  expect(result.actor).toBe('browser-actor');
});

test('Phase 2 real canvas photo codec uses verified MIME and keeps original bytes on opt-in', async ({
  page,
}) => {
  await page.goto('/');
  const result = await page.evaluate(
    async (paths) => {
      const { preparePhoto } = await import(paths.media),
        { browserPhotoCodec } = await import(paths.codec);
      const canvas = document.createElement('canvas');
      canvas.width = 16;
      canvas.height = 16;
      canvas.getContext('2d')!.fillRect(0, 0, 16, 16);
      const source = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), 'image/png'),
      );
      const limits = { inputBytes: 10000, outputBytes: 10000, pixels: 10000, longEdge: 8 };
      const original = await preparePhoto(source, true, limits, browserPhotoCodec);
      let output;
      try {
        const photo = await preparePhoto(source, false, limits, browserPhotoCodec);
        const header = new TextDecoder().decode((await photo.blob.arrayBuffer()).slice(8, 12));
        output = {
          mime: photo.blob.type,
          header,
          dimensions: await browserPhotoCodec.inspect(photo.blob),
        };
      } catch (error) {
        // Safari/WebKit canvas may return PNG for unsupported WebP. Fail closed and preserve input.
        if (!(error instanceof Error) || !error.message.includes('WebP')) throw error;
        output = { unsupported: true };
      }
      return {
        originalEqual:
          Array.from(new Uint8Array(await original.blob.arrayBuffer())).join(',') ===
          Array.from(new Uint8Array(await source.arrayBuffer())).join(','),
        output,
      };
    },
    {
      media: base + 'packages/persistence/src/media.ts',
      codec: base + 'apps/web/src/photo-codec.ts',
    },
  );
  expect(result.originalEqual).toBe(true);
  if ('mime' in result.output) {
    expect(result.output.mime).toBe('image/webp');
    expect(result.output.header).toBe('WEBP');
    expect(result.output.dimensions).toEqual({ width: 8, height: 8 });
  } else expect(result.output.unsupported).toBe(true);
});
