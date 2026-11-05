import './landing.css';
import { gameEvents } from '../systems/events.js';
import { enterFullscreenLandscape } from '../systems/fullscreen.js';

/**
 * The public "front door" shown before the game itself. Sits above the canvas
 * while BootScene loads the catalog/save in the background, then jumps
 * straight into the one house v1 has — the Map screen stays reachable from
 * inside the game (HouseScene's Back button) for when M5 adds more houses.
 */
export function mountLandingPage(game) {
  let bootReady = false;
  gameEvents.once('boot-ready', () => {
    bootReady = true;
  });

  const root = document.createElement('div');
  root.className = 'landing';
  root.innerHTML = `
    <h1 class="landing__title">Hannah's World</h1>
    <p class="landing__tagline">Decorate your dream dollhouse, find hidden coins, and make it your own.</p>
    <button class="landing__enter" type="button">Enter the House →</button>
  `;
  document.getElementById('ui-root').appendChild(root);

  const enterButton = root.querySelector('.landing__enter');
  enterButton.addEventListener('click', () => {
    // Must happen synchronously inside the click handler, before anything async,
    // or the browser no longer counts this as a user gesture and rejects the request.
    enterFullscreenLandscape();
    if (bootReady) {
      enter();
    } else {
      enterButton.disabled = true;
      enterButton.textContent = 'Loading...';
      gameEvents.once('boot-ready', enter);
    }
  });

  function enter() {
    root.remove();
    // game.scene.start() only stops the calling scene when invoked *from* a scene;
    // called from outside Phaser like this, Map would otherwise keep running underneath.
    game.scene.stop('Map');
    game.scene.start('House', { houseId: 'cottage_01' });
  }
}
