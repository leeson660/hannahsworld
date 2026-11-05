import './landing.css';
import { gameEvents } from '../systems/events.js';
import { enterFullscreenLandscape } from '../systems/fullscreen.js';

/**
 * The public "front door" shown before the game itself. Sits above the canvas while
 * BootScene loads the catalog/save and the one house boots underneath; Enter just
 * removes this overlay once boot is ready — House is the only scene there is.
 */
export function mountLandingPage() {
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
      root.remove();
    } else {
      enterButton.disabled = true;
      enterButton.textContent = 'Loading...';
      gameEvents.once('boot-ready', () => root.remove());
    }
  });
}
