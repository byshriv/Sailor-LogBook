import type { ImageCodec } from '../../../packages/persistence/src/media.ts';
// The package enforces budgets and MIME checks. This adapter owns browser decoding/encoding.
export const browserPhotoCodec: ImageCodec = {
  async inspect(blob) {
    const bitmap = await createImageBitmap(blob);
    try {
      return { width: bitmap.width, height: bitmap.height };
    } finally {
      bitmap.close();
    }
  },
  async webp(blob, longEdge) {
    const bitmap = await createImageBitmap(blob);
    try {
      const scale = Math.min(1, longEdge / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw Error('Image encoder unavailable');
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      return await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (output) => (output ? resolve(output) : reject(Error('Image encoding failed'))),
          'image/webp',
          0.82,
        ),
      );
    } finally {
      bitmap.close();
    }
  },
};
