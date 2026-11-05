import './topbar.css';

/**
 * Back/Undo live in the DOM, not the Phaser canvas, so they stay reachable even when
 * ENVELOP scaling crops a sliver off the top of the game world on wide phone screens.
 */
export class HouseTopBar {
  constructor({ onBack, onUndo }) {
    this.root = document.createElement('div');
    this.root.className = 'topbar';
    this.root.innerHTML = `
      <button type="button" data-action="back">← Back</button>
      <button type="button" data-action="undo">Undo</button>
    `;
    this.root.querySelector('[data-action="back"]').addEventListener('click', onBack);
    this.root.querySelector('[data-action="undo"]').addEventListener('click', onUndo);
  }

  mount() {
    document.getElementById('ui-root').appendChild(this.root);
  }

  unmount() {
    this.root.remove();
  }
}
