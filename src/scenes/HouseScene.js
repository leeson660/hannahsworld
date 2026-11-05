import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';

/**
 * The decorating engine. M0 stub: placeholder room and a back button only.
 * Drag-and-drop furniture, depth sorting and the item drawer land in M1.
 */
export class HouseScene extends Phaser.Scene {
  constructor() {
    super('House');
  }

  init(data) {
    this.houseId = data?.houseId ?? 'cottage_01';
  }

  create() {
    const cx = GAME_WIDTH / 2;

    this.cameras.main.setBackgroundColor('#ffe9b3');

    this.add
      .rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH - 80, GAME_HEIGHT - 160, 0xffd27f)
      .setStrokeStyle(4, 0xcc9a3f);

    this.add
      .text(cx, GAME_HEIGHT / 2, `House: ${this.houseId}\n(placeholder room — furniture coming in M1)`, {
        fontFamily: 'sans-serif',
        fontSize: '22px',
        color: '#6b4a1f',
        align: 'center',
      })
      .setOrigin(0.5);

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
  }
}
