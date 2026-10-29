// Conservative three-way merge. Missing entities are deletions, never empty records.
// Only independent top-level fields merge automatically; arrays/opaque nested values conflict.
export function reconcile<T extends object>(
  local: Record<string, T>,
  cloud: Record<string, T>,
  base: Record<string, T> | null,
  choices: Record<string, 'local' | 'cloud'> = {},
) {
  const equal = (a: unknown, b: unknown): boolean => {
    if (a === undefined || b === undefined) return a === b;
    const stable = (x: any): any =>
      Array.isArray(x)
        ? x.map(stable)
        : x && typeof x === 'object'
          ? Object.fromEntries(
              Object.keys(x)
                .sort()
                .map((k) => [k, stable(x[k])]),
            )
          : x;
    return JSON.stringify(stable(a)) === JSON.stringify(stable(b));
  };
  const entities: Record<string, T> = {},
    conflicts: string[] = [];
  for (const id of new Set([
    ...Object.keys(local),
    ...Object.keys(cloud),
    ...Object.keys(base ?? {}),
  ])) {
    const l = local[id],
      r = cloud[id],
      b = base?.[id];
    let next: T | undefined;
    if (equal(l, r)) next = l;
    else if (base && equal(l, b)) next = r;
    else if (base && equal(r, b)) next = l;
    else if (!base && !l) next = r;
    else if (!base && !r) next = l;
    else {
      let merged: any = undefined;
      if (base && l && r && b) {
        merged = {};
        for (const field of new Set([...Object.keys(l), ...Object.keys(r), ...Object.keys(b)])) {
          const a = (l as any)[field],
            c = (r as any)[field],
            d = (b as any)[field];
          if (equal(a, c) || equal(c, d)) {
            if (a !== undefined) merged[field] = a;
          } else if (equal(a, d)) {
            if (c !== undefined) merged[field] = c;
          } else {
            merged = undefined;
            break;
          }
        }
      }
      if (merged) next = merged;
      else if (choices[id]) next = choices[id] === 'local' ? l : r;
      else {
        conflicts.push(id);
        next = l;
      }
    }
    if (next) entities[id] = structuredClone(next);
  }
  return { entities, conflicts };
}
