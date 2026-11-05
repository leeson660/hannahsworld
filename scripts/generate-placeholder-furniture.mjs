// One-off placeholder furniture generator. Reads the hand-authored catalog.json
// (M1) and writes a flat-colour square PNG for each item that doesn't have
// real art yet, so the drag-and-drop drawer has something to show.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { makeSolidPng } from './lib/png-writer.mjs';

const COLORS = {
  sofa_red: [198, 60, 70],
  chair_blue: [70, 120, 198],
  armchair_green: [70, 160, 90],
  table_wood: [150, 105, 60],
  coffee_table_white: [225, 220, 210],
  rug_round: [170, 110, 190],
  lamp_floor: [230, 200, 80],
  plant_pot: [90, 150, 70],
  bookshelf: [120, 80, 50],
  clock_wall: [130, 130, 140],
};

const SIZE = 320;
const catalog = JSON.parse(readFileSync('public/assets/catalog.json', 'utf8'));

for (const item of catalog.items) {
  const outPath = `public/${item.sprite}`;
  if (existsSync(outPath)) continue; // never overwrite real art once it's dropped in
  const color = COLORS[item.id] ?? [160, 160, 160];
  writeFileSync(outPath, makeSolidPng(SIZE, SIZE, color));
  console.log(`wrote ${outPath}`);
}
