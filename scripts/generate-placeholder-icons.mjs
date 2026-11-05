// One-off placeholder icon generator. Writes flat-colour PNGs with no external
// image deps so M0 has installable PWA icons before real art exists.
import { writeFileSync } from 'node:fs';
import { makeSolidPng } from './lib/png-writer.mjs';

const PINK = [230, 126, 180];

writeFileSync('public/icons/icon-192.png', makeSolidPng(192, 192, PINK));
writeFileSync('public/icons/icon-512.png', makeSolidPng(512, 512, PINK));
writeFileSync('public/icons/icon-maskable-512.png', makeSolidPng(512, 512, PINK, 0.1));

console.log('Placeholder icons written to public/icons/.');
