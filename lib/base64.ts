// Minimal base64 → bytes decoder. Used for avatar uploads (the image picker
// hands back base64; Supabase storage wants an ArrayBuffer). Implemented by
// hand because Hermes' atob availability varies across versions and this is
// 20 lines.

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const LOOKUP = new Uint8Array(128);
for (let i = 0; i < ALPHABET.length; i++) {
  LOOKUP[ALPHABET.charCodeAt(i)] = i;
}

export function base64ToBytes(base64: string): Uint8Array {
  const clean = base64.replace(/=+$/, '');
  const byteLength = Math.floor((clean.length * 3) / 4);
  const bytes = new Uint8Array(byteLength);
  let byteIndex = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const a = LOOKUP[clean.charCodeAt(i)];
    const b = LOOKUP[clean.charCodeAt(i + 1)];
    const c = LOOKUP[clean.charCodeAt(i + 2)];
    const d = LOOKUP[clean.charCodeAt(i + 3)];
    bytes[byteIndex++] = (a << 2) | (b >> 4);
    if (byteIndex < byteLength) bytes[byteIndex++] = ((b & 15) << 4) | (c >> 2);
    if (byteIndex < byteLength) bytes[byteIndex++] = ((c & 3) << 6) | d;
  }
  return bytes;
}
