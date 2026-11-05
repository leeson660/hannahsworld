import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './config.js';
import { BootScene } from './scenes/BootScene.js';
import { HouseScene } from './scenes/HouseScene.js';
import { mountLandingPage } from './ui/LandingPage.js';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#fff1f7',
  scale: {
    // ENVELOP fills the whole screen edge-to-edge on any phone aspect ratio (like CSS
    // background-size: cover), instead of FIT's letterbox bars down the sides. The
    // trade-off is a sliver of top/bottom cropping on very wide phones, which is why
    // critical UI (top bar, drawer) lives in the DOM layer rather than the canvas.
    mode: Phaser.Scale.ENVELOP,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  scene: [BootScene, HouseScene],
});

mountLandingPage();
