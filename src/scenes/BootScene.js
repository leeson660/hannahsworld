import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { loadCatalog } from '../systems/Catalog.js';
import { loadSave } from '../systems/SaveManager.js';
import { gameEvents } from '../systems/events.js';

/** Preloads shared UI assets, loads the catalog and save, then hands off to the menu. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this.cameras.main.setBackgroundColor('#fff1f7');

    this.add
      .text(cx, cy - 40, "Hannah's World", {
        fontFamily: 'sans-serif',
        fontSize: '56px',
        color: '#e67eb4',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const statusText = this.add
      .text(cx, cy + 30, 'Loading...', {
        fontFamily: 'sans-serif',
        fontSize: '24px',
        color: '#7a5366',
      })
      .setOrigin(0.5);

    loadCatalog()
      .then(() => loadSave())
      .then(() => {
        // Start House first: the landing page waits on 'boot-ready' and otherwise does
        // nothing scene-related itself, so this must run before that event fires.
        this.scene.start('House', { houseId: 'cottage_01' });
        gameEvents.emit('boot-ready');
      })
      .catch((err) => {
        console.error('Boot failed:', err);
        statusText.setText('Something went wrong loading the game.\nPlease reload.');
      });
  }
}
