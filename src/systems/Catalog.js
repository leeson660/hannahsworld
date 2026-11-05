let cached = null;

/** Fetches and validates catalog.json. Call once at boot; later calls reuse the cached copy. */
export async function loadCatalog() {
  if (cached) return cached;

  const response = await fetch('/assets/catalog.json');
  if (!response.ok) throw new Error(`Failed to load catalog.json: ${response.status}`);
  const catalog = await response.json();

  if (!Array.isArray(catalog.houses) || catalog.houses.length === 0) {
    throw new Error('catalog.json has no houses');
  }
  if (!Array.isArray(catalog.items)) {
    throw new Error('catalog.json has no items array');
  }

  cached = catalog;
  return cached;
}

/** Throws if loadCatalog() has not resolved yet — scenes should only call this after BootScene. */
export function getCatalog() {
  if (!cached) throw new Error('Catalog not loaded yet — call loadCatalog() first');
  return cached;
}

export function getHouse(houseId) {
  const house = getCatalog().houses.find((h) => h.id === houseId);
  if (!house) throw new Error(`Unknown house id: ${houseId}`);
  return house;
}

export function getItemsForHouse() {
  // v1 has one shared item catalog for all houses; per-house item sets can be added later.
  return getCatalog().items;
}

export function getItem(itemId) {
  const item = getCatalog().items.find((i) => i.id === itemId);
  if (!item) throw new Error(`Unknown item id: ${itemId}`);
  return item;
}
