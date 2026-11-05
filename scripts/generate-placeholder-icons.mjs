// One-off placeholder icon generator. Writes flat-colour PNGs with no external
// image deps so M0 has installable PWA icons before real art exists.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

function crc32(buf) {
  let c;
  const table = crc32.table || (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
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

/** Builds a solid-colour PNG, optionally with a smaller inset square (for maskable safe-area preview). */
function makeSolidPng(size, [r, g, b], insetRatio = 0) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type: RGB
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdr = chunk('IHDR', ihdrData);

  const inset = Math.floor(size * insetRatio);
  const raw = Buffer.alloc(size * (size * 3 + 1));
  let offset = 0;
  for (let y = 0; y < size; y++) {
    raw[offset++] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const inSafeArea = x >= inset && x < size - inset && y >= inset && y < size - inset;
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

const PINK = [230, 126, 180];

writeFileSync('public/icons/icon-192.png', makeSolidPng(192, PINK));
writeFileSync('public/icons/icon-512.png', makeSolidPng(512, PINK));
writeFileSync('public/icons/icon-maskable-512.png', makeSolidPng(512, PINK, 0.1));

console.log('Placeholder icons written to public/icons/.');
