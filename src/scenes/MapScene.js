import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';

/**
 * v1 stub: a single house icon leading straight into HouseScene.
 * Becomes a multi-house island map in M5 (section 7 of SPEC.md).
 */
export class MapScene extends Phaser.Scene {
  constructor() {
    super('Map');
  }

  create() {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this.cameras.main.setBackgroundColor('#cdeedd');

    this.add
      .text(cx, 80, 'World Map (v1 stub)', {
        fontFamily: 'sans-serif',
        fontSize: '32px',
        color: '#2f5d46',
      })
      .setOrigin(0.5);

    const houseButton = this.add
      .rectangle(cx, cy, 260, 180, 0xf4c95d)
      .setStrokeStyle(4, 0x8a6a1f)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(cx, cy, 'Cozy Cottage', {
        fontFamily: 'sans-serif',
        fontSize: '24px',
        color: '#4a3a0f',
      })
      .setOrigin(0.5);

    houseButton.on('pointerup', () => {
      this.scene.start('House', { houseId: 'cottage_01' });
    });
  }
}
