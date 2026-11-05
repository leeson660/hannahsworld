// Minimal PNG encoder (no image-library dependency) used to generate flat-colour
// placeholder art for M0/M1 before real assets exist.
import { deflateSync } from 'node:zlib';

function crc32(buf) {
  const table = crc32.table || (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

/** Builds a solid-colour PNG, optionally with a lighter inset square (e.g. for maskable safe-area preview). */
export function makeSolidPng(width, height, [r, g, b], insetRatio = 0) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type: RGB
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdr = chunk('IHDR', ihdrData);

  const insetX = Math.floor(width * insetRatio);
  const insetY = Math.floor(height * insetRatio);
  const raw = Buffer.alloc(height * (width * 3 + 1));
  let offset = 0;
  for (let y = 0; y < height; y++) {
    raw[offset++] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const inSafeArea = x >= insetX && x < width - insetX && y >= insetY && y < height - insetY;
      if (insetRatio > 0 && !inSafeArea) {
        raw[offset++] = Math.min(255, r + 25);
        raw[offset++] = Math.min(255, g + 25);
        raw[offset++] = Math.min(255, b + 25);
      } else {
        raw[offset++] = r;
        raw[offset++] = g;
        raw[offset++] = b;
      }
    }
  }
  const idat = chunk('IDAT', deflateSync(raw));
  const iend = chunk('IEND', Buffer.alloc(0));
  return Buffer.concat([sig, ihdr, idat, iend]);
}
