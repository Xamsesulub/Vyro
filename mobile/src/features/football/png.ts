// Small RGBA PNG encoder for a local map overlay. No network, filesystem or
// native dependency. Uncompressed DEFLATE keeps runtime and memory predictable.
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c >>> 0;
}
function u32(n: number) {
  return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
}
function chunk(name: string, data: number[]) {
  const bytes = [...Array.from(name, (c) => c.charCodeAt(0)), ...data];
  let crc = 0xffffffff;
  for (const b of bytes) crc = crcTable[(crc ^ b) & 255] ^ (crc >>> 8);
  return [...u32(data.length), ...bytes, ...u32((crc ^ 0xffffffff) >>> 0)];
}
export function rgbaPng(size: number, pixels: Uint8Array): string {
  if (
    !Number.isInteger(size) ||
    size < 1 ||
    size > 256 ||
    pixels.length !== size * size * 4
  )
    throw new Error("Invalid heatmap raster");
  const raw: number[] = [];
  for (let y = 0; y < size; y++) {
    raw.push(0); // PNG row filter: none
    for (let x = 0; x < size * 4; x++) raw.push(pixels[y * size * 4 + x]);
  }
  const z = [0x78, 0x01];
  for (let i = 0; i < raw.length; i += 65535) {
    const block = raw.slice(i, i + 65535),
      n = block.length;
    z.push(
      i + n === raw.length ? 1 : 0,
      n & 255,
      n >>> 8,
      ~n & 255,
      (~n >>> 8) & 255,
    );
    for (const byte of block) z.push(byte);
  }
  let a = 1,
    b = 0;
  for (const byte of raw) {
    a = (a + byte) % 65521;
    b = (b + a) % 65521;
  }
  z.push(...u32((b * 65536 + a) >>> 0));
  const result = [137, 80, 78, 71, 13, 10, 26, 10].concat(
    chunk("IHDR", [...u32(size), ...u32(size), 8, 6, 0, 0, 0]),
    chunk("IDAT", z),
    chunk("IEND", []),
  );
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let encoded = "";
  for (let i = 0; i < result.length; i += 3) {
    const n =
      (result[i] << 16) | ((result[i + 1] ?? 0) << 8) | (result[i + 2] ?? 0);
    encoded +=
      alphabet[(n >>> 18) & 63] +
      alphabet[(n >>> 12) & 63] +
      (i + 1 < result.length ? alphabet[(n >>> 6) & 63] : "=") +
      (i + 2 < result.length ? alphabet[n & 63] : "=");
  }
  return `data:image/png;base64,${encoded}`;
}
