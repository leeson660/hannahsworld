import { get, set } from 'idb-keyval';
import { getCatalog } from './Catalog.js';

const SAVE_KEY = 'save';
const BACKUP_KEY = 'save-backup';
const CURRENT_VERSION = 1;

let current = null;
let saveTimer = null;

function freshSave() {
  const catalog = getCatalog();
  const freeHouseIds = catalog.houses.filter((h) => h.price === 0).map((h) => h.id);
  return {
    version: CURRENT_VERSION,
    playerId: crypto.randomUUID(),
    coins: catalog.economy?.startingCoins ?? 0,
    owned: { items: [], houses: freeHouseIds, clothing: [] },
    houses: {},
    characters: { main: { body: null, outfit: null, pose: 'stand' } },
    daily: { nextGiftAt: 0, coinsFoundToday: 0, dayKey: null },
    purchases: [],
  };
}

/** Fills in fields missing from an older or hand-edited save without discarding existing progress. */
function migrate(save) {
  const base = freshSave();
  return {
    ...base,
    ...save,
    version: CURRENT_VERSION,
    owned: { ...base.owned, ...save.owned },
    houses: { ...base.houses, ...save.houses },
    characters: { ...base.characters, ...save.characters },
    daily: { ...base.daily, ...save.daily },
  };
}

/** Loads the save from IndexedDB, migrating or recreating it as needed. Call once after the catalog is loaded. */
export async function loadSave() {
  let stored = null;
  try {
    stored = (await get(SAVE_KEY)) ?? null;
    current = stored ? migrate(stored) : freshSave();
  } catch (err) {
    console.error('Save load failed, starting fresh:', err);
    if (stored != null) await set(BACKUP_KEY, stored).catch(() => {});
    current = freshSave();
  }
  navigator.storage?.persist?.().catch(() => {});
  return current;
}

export function getSave() {
  if (!current) throw new Error('Save not loaded yet — call loadSave() first');
  return current;
}

export function getHouseLayout(houseId) {
  return getSave().houses[houseId] ?? [];
}

/** Replaces a house's item placements and schedules a debounced write. */
export function setHouseLayout(houseId, layout) {
  getSave().houses[houseId] = layout;
  requestSave();
}

/** Call after any mutation to the current save. Debounces the actual IndexedDB write. */
export function requestSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, 500);
}

export async function flushSave() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (!current) return;
  await set(SAVE_KEY, current);
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushSave();
  });
}
