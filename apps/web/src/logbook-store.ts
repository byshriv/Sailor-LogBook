import { configureStore, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { blankLogbook } from '../../../packages/domain/src/logbook.ts';
import type { EditCommand, Logbook } from '../../../packages/domain/src/logbook.ts';
import { OperationPipeline } from '../../../packages/persistence/src/logbook.ts';
import type { LogbookStore } from '../../../packages/persistence/src/logbook.ts';

// Composition seam for later screens; Redux only publishes committed IndexedDB state.
export async function createLogbookProjection(db: LogbookStore, schedule: () => void) {
  const projection = createSlice({
    name: 'logbook',
    initialState: blankLogbook(),
    reducers: { durable: (_state, action: PayloadAction<Logbook>) => action.payload },
  });
  const store = configureStore({ reducer: projection.reducer });
  store.dispatch(projection.actions.durable(await db.load()));
  const pipeline = new OperationPipeline(
    db,
    (state) => store.dispatch(projection.actions.durable(state)),
    schedule,
  );
  return {
    db,
    erasure: await db.erasureStatus(),
    refresh: async () => store.dispatch(projection.actions.durable(await db.load())),
    store,
    pipeline,
    attachment: db.attachment,
    save: (command: EditCommand, attachments: { id: string; digest: string; blob: Blob }[] = []) =>
      pipeline.save(command, undefined, attachments),
  };
}
