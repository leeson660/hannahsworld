import './ui.css';

function label(category) {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

/**
 * The furniture side panel (DOM, not Phaser) that HouseScene mounts/unmounts — docked to
 * the right edge so it reads as a tool panel over the room rather than a separate page.
 * Tapping an item adds it to whichever room is currently centred on screen (HouseScene
 * decides where); the item is then draggable in the house scene like any other.
 */
export class ItemDrawer {
  constructor(items, onItemTap) {
    this.items = items;
    this.onItemTap = onItemTap;
    this.onToggle = null; // HouseScene hooks this to re-centre the current room when the panel opens/closes
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
    this.root.remove();
    this.toggleButton.remove();
  }

  _setOpen(open) {
    this.isOpen = open;
    this.root.classList.toggle('item-drawer--closed', !open);
    this.toggleButton.classList.toggle('item-drawer__toggle--open', open);
    this.toggleButton.textContent = open ? '✕ Close' : '+ Add Furniture';
    this.onToggle?.();
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
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'item-drawer__card';

      const img = document.createElement('img');
      img.src = `/${item.sprite}`;
      img.alt = item.name;
      img.draggable = false;

      const name = document.createElement('span');
      name.textContent = item.name;

      card.appendChild(img);
      card.appendChild(name);
      card.addEventListener('click', () => this.onItemTap(item));
      this.row.appendChild(card);
    }
  }
}
