import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';

/** Preloads shared UI assets, loads the save, then hands off to the menu. */
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

    this.add
      .text(cx, cy + 30, 'Loading...', {
        fontFamily: 'sans-serif',
        fontSize: '24px',
        color: '#7a5366',
      })
      .setOrigin(0.5);

    // TODO (M1+): await SaveManager load here before deciding where to send the player.
    this.time.delayedCall(600, () => this.scene.start('Map'));
  }
}
