export async function sha256(bytes: ArrayBuffer): Promise<string> {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (n) =>
    n.toString(16).padStart(2, '0'),
  ).join('');
}
export const textDigest = (s: string) => sha256(new TextEncoder().encode(s).buffer);
export interface MediaLimits {
  inputBytes: number;
  outputBytes: number;
  pixels: number;
  longEdge: number;
}
export interface ImageCodec {
  inspect(blob: Blob): Promise<{ width: number; height: number }>;
  webp(blob: Blob, longEdge: number): Promise<Blob>;
}
export async function preparePhoto(
  source: Blob,
  keepOriginal: boolean,
  limits: MediaLimits,
  codec: ImageCodec,
) {
  if (Object.values(limits).some((n) => !Number.isSafeInteger(n) || n <= 0))
    throw Error('Explicit media budgets required');
  if (
    !['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(source.type) ||
    source.size > limits.inputBytes ||
    !source.size
  )
    throw Error('Unsupported or oversized photo');
  const size = await codec.inspect(source);
  if (
    !Number.isSafeInteger(size.width) ||
    !Number.isSafeInteger(size.height) ||
    size.width <= 0 ||
    size.height <= 0 ||
    size.width * size.height > limits.pixels
  )
    throw Error('Photo memory limit');
  const blob = keepOriginal ? source : await codec.webp(source, limits.longEdge);
  if (!keepOriginal && (blob.type !== 'image/webp' || !blob.size || blob.size > limits.outputBytes))
    throw Error('WebP encoding unavailable or exceeds budget');
  if (!keepOriginal) {
    const output = await codec.inspect(blob);
    if (Math.max(output.width, output.height) > limits.longEdge)
      throw Error('Encoder exceeded dimensions');
  }
  const digest = await sha256(await blob.arrayBuffer());
  return { id: digest, digest, blob, keptOriginal: keepOriginal, estimatedBytes: blob.size };
}
