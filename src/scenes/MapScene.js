import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { enterFullscreenLandscape } from '../systems/fullscreen.js';

/**
 * v1 stub: the cutaway house image acts as a menu (SPEC.md section 7) with a single
 * tappable hotspot leading into HouseScene. Becomes a real multi-house island map in M5.
 */
export class MapScene extends Phaser.Scene {
  constructor() {
    super('Map');
  }

  preload() {
    this.load.image('house_overview', '/assets/houses/house_bg.png');
  }

  create() {
    this.cameras.main.setBackgroundColor('#cdeedd');

    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'house_overview').setDisplaySize(GAME_WIDTH, GAME_HEIGHT);

    this.add
      .text(GAME_WIDTH / 2, 36, "Hannah's World", {
        fontFamily: 'sans-serif',
        fontSize: '28px',
        color: '#2f5d46',
        backgroundColor: '#ffffffcc',
        padding: { x: 14, y: 6 },
      })
      .setOrigin(0.5);

    const enterButton = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 60, 'Tap to decorate →', {
        fontFamily: 'sans-serif',
        fontSize: '26px',
        color: '#4a3a0f',
        backgroundColor: '#f4c95dee',
        padding: { x: 20, y: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    enterButton.on('pointerup', () => {
      enterFullscreenLandscape();
      this.scene.start('House', { houseId: 'cottage_01' });
    });
  }
}
