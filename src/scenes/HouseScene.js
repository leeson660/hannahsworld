import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { getHouse, getItemsForHouse } from '../systems/Catalog.js';
import { getHouseLayout, setHouseLayout } from '../systems/SaveManager.js';
import { DragDrop } from '../systems/DragDrop.js';
import { ItemDrawer } from '../ui/ItemDrawer.js';
import { gameEvents } from '../systems/events.js';

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
    const bgKey = `bg_${this.houseId}`;
    if (!this.bgLoadFailed && this.textures.exists(bgKey)) {
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, bgKey).setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    } else {
      // No real room art yet at this.house.background — draw a labelled placeholder (SPEC.md rule 4).
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

    this.dragDrop = new DragDrop(this, this.house, (layout) => setHouseLayout(this.houseId, layout));
    this.dragDrop.loadLayout(getHouseLayout(this.houseId));

    this._buildTopBar();

    this.drawer = new ItemDrawer(this.items);
    this.drawer.mount();

    this._onItemDrop = ({ itemId, clientX, clientY }) => {
      const worldX = this.scale.transformX(clientX);
      const worldY = this.scale.transformY(clientY);
      this.dragDrop.placeNewItem(itemId, worldX, worldY);
    };
    gameEvents.on('item-drop', this._onItemDrop);

    this.events.once('shutdown', () => this._cleanup());
  }

  _buildTopBar() {
    const backButton = this.add
      .text(40, 30, '← Back', {
        fontFamily: 'sans-serif',
        fontSize: '24px',
        color: '#4a3a0f',
        backgroundColor: '#ffffffaa',
        padding: { x: 12, y: 8 },
      })
      .setInteractive({ useHandCursor: true });
    backButton.on('pointerup', () => this.scene.start('Map'));

    const undoButton = this.add
      .text(GAME_WIDTH - 160, 30, 'Undo', {
        fontFamily: 'sans-serif',
        fontSize: '24px',
        color: '#4a3a0f',
        backgroundColor: '#ffffffaa',
        padding: { x: 12, y: 8 },
      })
      .setInteractive({ useHandCursor: true });
    undoButton.on('pointerup', () => this.dragDrop.undo());
  }

  _cleanup() {
    gameEvents.off('item-drop', this._onItemDrop);
    this.drawer.unmount();
  }
}
