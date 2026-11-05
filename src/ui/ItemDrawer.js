import './ui.css';
import { gameEvents } from '../systems/events.js';

const DRAG_START_THRESHOLD = 8; // px of horizontal movement (toward the room) before a card press becomes a drag

function label(category) {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

/**
 * The furniture side panel (DOM, not Phaser) that HouseScene mounts/unmounts — docked to
 * the right edge so it reads as a tool panel over the room rather than a separate page.
 * Dragging is implemented with Pointer Events rather than native HTML5 drag-and-drop,
 * since native DnD does not work reliably on touch devices.
 */
export class ItemDrawer {
  constructor(items) {
    this.items = items;
    this.categories = [...new Set(items.map((i) => i.category))];
    this.activeCategory = this.categories[0];
    this.isOpen = false;

    this.root = document.createElement('div');
    this.root.className = 'item-drawer item-drawer--closed';
    this._build();

    this.toggleButton = document.createElement('button');
    this.toggleButton.type = 'button';
    this.toggleButton.className = 'item-drawer__toggle';
    this.toggleButton.textContent = '+ Add Furniture';
    this.toggleButton.addEventListener('click', () => this._setOpen(!this.isOpen));
  }

  mount() {
    document.getElementById('ui-root').appendChild(this.root);
    document.getElementById('ui-root').appendChild(this.toggleButton);
  }

  unmount() {
    this._cancelDrag();
    this.root.remove();
    this.toggleButton.remove();
  }

  _setOpen(open) {
    this.isOpen = open;
    this.root.classList.toggle('item-drawer--closed', !open);
    this.toggleButton.classList.toggle('item-drawer__toggle--open', open);
    this.toggleButton.textContent = open ? '✕ Close' : '+ Add Furniture';
  }

  _build() {
    const tabs = document.createElement('div');
    tabs.className = 'item-drawer__tabs';
    for (const category of this.categories) {
      const tab = document.createElement('button');
      tab.className = 'item-drawer__tab';
      tab.type = 'button';
      tab.textContent = label(category);
      tab.setAttribute('aria-selected', String(category === this.activeCategory));
      tab.addEventListener('click', () => this._selectCategory(category));
      tabs.appendChild(tab);
    }
    this.tabs = tabs;

    this.row = document.createElement('div');
    this.row.className = 'item-drawer__row';

    this.root.appendChild(tabs);
    this.root.appendChild(this.row);
    this._renderRow();
  }

  _selectCategory(category) {
    this.activeCategory = category;
    for (const tab of this.tabs.children) {
      tab.setAttribute('aria-selected', String(tab.textContent === label(category)));
    }
    this._renderRow();
  }

  _renderRow() {
    this.row.innerHTML = '';
    for (const item of this.items.filter((i) => i.category === this.activeCategory)) {
      const card = document.createElement('div');
      card.className = 'item-drawer__card';

      const img = document.createElement('img');
      img.src = `/${item.sprite}`;
      img.alt = item.name;
      img.draggable = false;

      const name = document.createElement('span');
      name.textContent = item.name;

      card.appendChild(img);
      card.appendChild(name);
      card.addEventListener('pointerdown', (event) => this._onPointerDown(event, item));
      this.row.appendChild(card);
    }
  }

  _onPointerDown(event, item) {
    const startX = event.clientX;
    const startY = event.clientY;
    const spriteUrl = `/${item.sprite}`;

    const onMove = (moveEvent) => {
      if (!this.dragging) {
        if (Math.abs(moveEvent.clientX - startX) < DRAG_START_THRESHOLD) return;
        this._startDrag(item, spriteUrl, startX, startY);
      }
      moveEvent.preventDefault();
      this._updateGhost(moveEvent.clientX, moveEvent.clientY);
    };

    const onUp = (upEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      if (this.dragging) this._endDrag(upEvent.clientX, upEvent.clientY);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }

  _startDrag(item, spriteUrl, x, y) {
    this.dragging = { item };
    this.ghost = document.createElement('img');
    this.ghost.className = 'item-drawer__ghost';
    this.ghost.src = spriteUrl;
    document.getElementById('ui-root').appendChild(this.ghost);
    this._updateGhost(x, y);
  }

  _updateGhost(x, y) {
    if (!this.ghost) return;
    this.ghost.style.left = `${x}px`;
    this.ghost.style.top = `${y}px`;
  }

  _endDrag(clientX, clientY) {
    const { item } = this.dragging;
    const drawerLeft = this.root.getBoundingClientRect().left;
    this._cancelDrag();
    if (clientX < drawerLeft) {
      gameEvents.emit('item-drop', { itemId: item.id, clientX, clientY });
    }
  }

  _cancelDrag() {
    this.ghost?.remove();
    this.ghost = null;
    this.dragging = null;
  }
}
