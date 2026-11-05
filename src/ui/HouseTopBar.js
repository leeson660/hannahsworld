import './topbar.css';

/**
 * Whole-House/room-name/Undo live in the DOM, not the Phaser canvas, so they stay
 * reachable even when ENVELOP scaling crops a sliver off the top of the game world
 * on wide phone screens.
 */
export class HouseTopBar {
  constructor({ onWholeHouse, onUndo }) {
    this.root = document.createElement('div');
    this.root.className = 'topbar';
    this.root.innerHTML = `
      <button type="button" data-action="whole-house">⌂ Whole House</button>
      <div class="topbar__room-name" data-role="room-name"></div>
      <button type="button" data-action="undo">Undo</button>
    `;
    this.root.querySelector('[data-action="whole-house"]').addEventListener('click', onWholeHouse);
    this.root.querySelector('[data-action="undo"]').addEventListener('click', onUndo);
    this.roomNameEl = this.root.querySelector('[data-role="room-name"]');
  }

  setRoomName(name) {
    this.roomNameEl.textContent = name;
  }

  mount() {
    document.getElementById('ui-root').appendChild(this.root);
  }

  unmount() {
    this.root.remove();
  }
}
