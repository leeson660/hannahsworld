import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { getHouse, getItemsForHouse } from '../systems/Catalog.js';
import { getHouseLayout, setHouseLayout } from '../systems/SaveManager.js';
import { DragDrop } from '../systems/DragDrop.js';
import { ItemDrawer } from '../ui/ItemDrawer.js';
import { HouseTopBar } from '../ui/HouseTopBar.js';
import { gameEvents } from '../systems/events.js';

// The world is bigger than the screen so the camera can start zoomed into one whole room
// and pan to reveal the rest of the house (SPEC.md section 7's multi-room houses,
// approximated here with one big image instead of separate room backgrounds). Measured
// against house_bg.png: each room column is ~24% of the image width, so zooming to
// ~1/0.24 makes one room's width fill the screen (height slightly overflows/crops rather
// than showing slivers of neighbouring rooms, since the room isn't exactly 16:9). Tune
// once real per-room art replaces the placeholder cutaway image.
const ROOM_ZOOM = 4.1;

// Centre of the left column's middle room (the bathroom) in house_bg.png, as a fraction
// of the image's width/height — measured by eye, not pixel-exact.
const INITIAL_FOCUS = { xFraction: 0.146, yFraction: 0.464 };

/** The decorating engine: placeholder room + drag-and-drop furniture (SPEC.md section 8). */
export class HouseScene extends Phaser.Scene {
  constructor() {
    super('House');
  }

  init(data) {
    this.houseId = data?.houseId ?? 'cottage_01';
    this.house = getHouse(this.houseId);
    this.items = getItemsForHouse();
    this.bgLoadFailed = false;
  }

  preload() {
    const bgKey = `bg_${this.houseId}`;
    this.load.image(bgKey, `/${this.house.background}`);
    this.load.once('loaderror', (file) => {
      if (file.key === bgKey) this.bgLoadFailed = true;
    });
    for (const item of this.items) {
      this.load.image(item.id, `/${item.sprite}`);
    }
  }

  create() {
    this.cameras.main.setBackgroundColor('#fff1f7'); // belt-and-suspenders: covers any gap if another scene is still active underneath

    const bgKey = `bg_${this.houseId}`;
    const hasRealBackground = !this.bgLoadFailed && this.textures.exists(bgKey);
    // No real per-room art yet (SPEC.md rule 4): the placeholder fallback stays screen-sized
    // (nothing to pan across), only the real cutaway image gets the bigger pannable world.
    this.worldWidth = hasRealBackground ? GAME_WIDTH * ROOM_ZOOM : GAME_WIDTH;
    this.worldHeight = hasRealBackground ? GAME_HEIGHT * ROOM_ZOOM : GAME_HEIGHT;

    if (hasRealBackground) {
      this.add.image(this.worldWidth / 2, this.worldHeight / 2, bgKey).setDisplaySize(this.worldWidth, this.worldHeight);
    } else {
      this.add
        .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH - 80, GAME_HEIGHT - 160, 0xffd27f)
        .setStrokeStyle(4, 0xcc9a3f);
      this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 200, `${this.house.name}\n(placeholder room — drop a real background at\n${this.house.background})`, {
          fontFamily: 'sans-serif',
          fontSize: '20px',
          color: '#6b4a1f',
          align: 'center',
        })
        .setOrigin(0.5);
    }

    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
    if (hasRealBackground) {
      this.cameras.main.centerOn(this.worldWidth * INITIAL_FOCUS.xFraction, this.worldHeight * INITIAL_FOCUS.yFraction);
    } else {
      this.cameras.main.centerOn(this.worldWidth / 2, this.worldHeight / 2);
    }

    this.dragDrop = new DragDrop(
      this,
      this.house,
      (layout) => setHouseLayout(this.houseId, layout),
      this.worldWidth,
      this.worldHeight,
    );
    this.dragDrop.loadLayout(getHouseLayout(this.houseId));

    this.topBar = new HouseTopBar({
      onBack: () => this.scene.start('Map'),
      onUndo: () => this.dragDrop.undo(),
    });
    this.topBar.mount();

    this.drawer = new ItemDrawer(this.items);
    this.drawer.mount();

    this._onItemDrop = ({ itemId, clientX, clientY }) => {
      // transformX/Y give canvas-space coordinates; getWorldPoint accounts for the
      // camera's current scroll so drops land where they visually appear, not where
      // they'd be if the camera were still at its default (0, 0) position.
      const canvasX = this.scale.transformX(clientX);
      const canvasY = this.scale.transformY(clientY);
      const { x: worldX, y: worldY } = this.cameras.main.getWorldPoint(canvasX, canvasY);
      this.dragDrop.placeNewItem(itemId, worldX, worldY);
    };
    gameEvents.on('item-drop', this._onItemDrop);

    this.events.once('shutdown', () => this._cleanup());
  }

  _cleanup() {
    gameEvents.off('item-drop', this._onItemDrop);
    this.drawer.unmount();
    this.topBar.unmount();
  }
}
