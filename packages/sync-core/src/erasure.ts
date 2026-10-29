export interface ErasureMarker {
  format: 'slb-erased';
  protocol: 2;
  reader: 2;
  generation: string;
  at: string;
}
export function erasureMarker(raw: string): ErasureMarker | null {
  const value = JSON.parse(raw);
  if (value?.format !== 'slb-erased') return null;
  if (
    raw.length > 1024 ||
    Object.keys(value).sort().join(',') !== 'at,format,generation,protocol,reader' ||
    value.protocol !== 2 ||
    value.reader !== 2 ||
    !/^[a-f0-9-]{36}$/.test(value.generation) ||
    typeof value.at !== 'string' ||
    !Number.isFinite(Date.parse(value.at))
  )
    throw Error('Unsupported cloud deletion barrier');
  return value;
}
