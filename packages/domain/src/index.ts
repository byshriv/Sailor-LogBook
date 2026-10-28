// Phase 1 proof vocabulary only; the complete migrated model belongs to Phase 2.
export interface Entry {
  id: string;
  title: string;
  wallDate: string;
  start: number;
  end: number;
}
export interface State {
  entries: Record<string, Entry>;
}
export interface Command {
  id: string;
  type: 'entry.put';
  entry: Entry;
}
export interface Operation {
  schema: 1;
  id: string;
  actor: string;
  sequence: number;
  command: Command;
}
export const emptyState = (): State => ({ entries: {} });
export function transition(state: State, command: Command): State {
  const e = command.entry;
  if (
    command.type !== 'entry.put' ||
    !command.id ||
    command.id.length > 128 ||
    !e ||
    !e.id ||
    e.id.length > 128 ||
    ['__proto__', 'constructor', 'prototype'].includes(e.id) ||
    typeof e.title !== 'string' ||
    !e.title.trim() ||
    e.title.length > 500 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(e.wallDate) ||
    new Date(e.wallDate + 'T00:00:00Z').toISOString().slice(0, 10) !== e.wallDate ||
    !Number.isInteger(e.start) ||
    !Number.isInteger(e.end) ||
    e.start < 0 ||
    e.end > 1440 ||
    e.end <= e.start
  ) {
    throw new Error('Invalid proof command');
  }
  return { entries: { ...state.entries, [e.id]: { ...e, title: e.title.trim() } } };
}
export function replay(operations: Operation[]): State {
  let state = emptyState();
  const seen = new Set<string>();
  let sequence = 0;
  for (const op of operations) {
    if (
      op.schema !== 1 ||
      op.sequence !== ++sequence ||
      !op.actor ||
      seen.has(op.id) ||
      op.id !== op.command.id
    ) {
      throw new Error('Invalid operation tail; recovery required');
    }
    seen.add(op.id);
    state = transition(state, op.command);
  }
  return state;
}
