import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { getItem } from './Catalog.js';

const DISPLAY_SCALE = 0.35; // uniform scale from source pixels to scene pixels; keeps relative item sizes from the art intact
const TINT_PRESETS = [null, 0xff9e9e, 0x9effa0, 0x9ec4ff, 0xffe28a, 0xe29eff];
const ACTION_BUTTON_SIZE = 64;
const ACTION_BUTTON_GAP = 10;

/**
 * Owns every placed furniture item in a house: spawning, dragging, depth sort,
 * surfaces, the per-item action menu (flip/delete/tint/reorder) and one-step undo.
 * Also owns panning: the room can be bigger than the screen (SPEC.md's planned
 * multi-room houses, approximated for now by panning around one big image), so
 * dragging the empty background scrolls the camera instead of the world.
 */
export class DragDrop {
  constructor(scene, house, onChange, worldWidth = GAME_WIDTH, worldHeight = GAME_HEIGHT) {
    this.scene = scene;
    this.house = house;
    this.onChange = onChange; // called with the serialised layout whenever it changes, for autosave
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.placed = new Set();
    this.selected = null;
    this.undoSnapshot = null;

    scene.input.dragDistanceThreshold = 10;
    this._buildActionMenu();
    this._buildBackground();

    scene.input.on('drag', (pointer, go, dragX, dragY) => {
      if (go === this.background) this._onBackgroundDrag(pointer);
      else this._onDrag(go, dragX, dragY);
    });
    scene.input.on('dragend', (_pointer, go) => {
      if (go !== this.background) this._onDragEnd(go);
    });
  }

  loadLayout(layout) {
    for (const placement of layout) this._spawn(placement);
    this._sortAllDepths();
  }

  /** Called when an item is dropped in from the drawer, in scene-world coordinates. */
  placeNewItem(itemId, worldX, worldY) {
    this._snapshotForUndo();
    const go = this._spawn({ itemId, x: worldX, y: worldY, flipX: false, tint: null, z: 0 });
    this._clampToBounds(go);
    this._trySnapToSurface(go);
    this._sortAllDepths();
    this._persist();
    return go;
  }

  undo() {
    if (!this.undoSnapshot) return;
    const snapshot = this.undoSnapshot;
    this.undoSnapshot = null;
    this.deselect();
    for (const go of [...this.placed]) this._destroy(go);
    for (const placement of snapshot) this._spawn(placement);
    this._sortAllDepths();
    this._persist();
  }

  serializeLayout() {
    return [...this.placed].map((go) => ({
      itemId: go.itemId,
      x: Math.round(go.x),
      y: Math.round(go.y),
      flipX: go.flipX,
      tint: go.tintColor ?? null,
      z: go.manualBias ?? 0,
    }));
  }

  // --- spawning -----------------------------------------------------------

  _spawn(placement) {
    const item = getItem(placement.itemId);
    const go = this.scene.add.image(placement.x, placement.y, placement.itemId);
    go.setOrigin(0.5, 1);
    go.setScale(DISPLAY_SCALE);
    go.setFlipX(!!placement.flipX);
    go.itemId = placement.itemId;
    go.isSurface = !!item.isSurface;
    go.surfaceLine = item.surfaceLine;
    go.tintable = !!item.tintable;
    go.tintColor = placement.tint ?? null;
    go.manualBias = placement.z ?? 0;
    go.surfaceChildren = new Set();
    go.parentSurface = null;
    if (go.tintColor != null) go.setTint(go.tintColor);

    go.setInteractive({ draggable: true, useHandCursor: true });
    go.on('pointerdown', () => {
      go._wasDragged = false;
    });
    go.on('dragstart', () => {
      go._wasDragged = true;
      this.deselect();
    });
    go.on('pointerup', () => {
      if (!go._wasDragged) this._select(go);
    });

    this.placed.add(go);
    if (go.isSurface) this._reattachChildrenIfAny(go);
    this._updateDepth(go);
    return go;
  }

  _destroy(go) {
    this._detachFromSurface(go);
    for (const child of go.surfaceChildren) child.parentSurface = null;
    this.placed.delete(go);
    if (this.selected === go) this.deselect();
    go.destroy();
  }

  // --- dragging -------------------------------------------------------------

  _onDrag(go, dragX, dragY) {
    const dx = dragX - go.x;
    const dy = dragY - go.y;
    go.x = dragX;
    go.y = dragY;
    this._updateDepth(go);
    if (go.isSurface) {
      for (const child of go.surfaceChildren) {
        child.x += dx;
        child.y += dy;
        this._updateDepth(child);
      }
    }
  }

  _onDragEnd(go) {
    this._clampToBounds(go);
    if (!go.isSurface) this._trySnapToSurface(go);
    this._sortAllDepths();
    this._persist();
  }

  _clampToBounds(go) {
    const halfW = go.displayWidth / 2;
    go.x = Phaser.Math.Clamp(go.x, halfW, this.worldWidth - halfW);
    go.y = Phaser.Math.Clamp(go.y, go.displayHeight, this.worldHeight);
  }

  // --- surfaces ---------------------------------------------------------

  _surfaceBounds(surface) {
    return new Phaser.Geom.Rectangle(
      surface.x - surface.displayWidth / 2,
      surface.y - surface.displayHeight,
      surface.displayWidth,
      surface.displayHeight,
    );
  }

  _trySnapToSurface(go) {
    this._detachFromSurface(go);
    for (const surface of this.placed) {
      if (surface === go || !surface.isSurface) continue;
      if (Phaser.Geom.Rectangle.Contains(this._surfaceBounds(surface), go.x, go.y)) {
        go.y = surface.y - surface.displayHeight * (1 - (surface.surfaceLine ?? 0.3));
        this._clampToBounds(go);
        go.parentSurface = surface;
        surface.surfaceChildren.add(go);
        this._updateDepth(go);
        return;
      }
    }
  }

  _detachFromSurface(go) {
    if (go.parentSurface) {
      go.parentSurface.surfaceChildren.delete(go);
      go.parentSurface = null;
    }
  }

  _reattachChildrenIfAny() {
    // Items load in save order, so a surface's children may not exist yet when the surface spawns.
    // Re-run snap-detection for every non-surface item once all items are loaded.
    this.scene.time.delayedCall(0, () => {
      for (const go of this.placed) {
        if (!go.isSurface) this._trySnapToSurface(go);
      }
      this._sortAllDepths();
    });
  }

  // --- depth --------------------------------------------------------------

  _updateDepth(go) {
    go.setDepth(go.y + (go.manualBias ?? 0));
  }

  _sortAllDepths() {
    for (const go of this.placed) this._updateDepth(go);
  }

  // --- selection and action menu -------------------------------------------

  _buildBackground() {
    const bg = this.scene.add.rectangle(this.worldWidth / 2, this.worldHeight / 2, this.worldWidth, this.worldHeight, 0x000000, 0);
    bg.setDepth(-1);
    bg.setInteractive({ draggable: true });
    bg.on('pointerdown', () => {
      bg._wasDragged = false;
    });
    bg.on('dragstart', () => {
      bg._wasDragged = true;
      this.deselect();
    });
    bg.on('pointerup', () => {
      if (!bg._wasDragged) this.deselect();
    });
    this.background = bg;
  }

  _onBackgroundDrag(pointer) {
    const cam = this.scene.cameras.main;
    cam.scrollX -= pointer.x - pointer.prevPosition.x;
    cam.scrollY -= pointer.y - pointer.prevPosition.y;
  }

  _buildActionMenu() {
    this.menu = this.scene.add.container(0, 0).setDepth(100000).setVisible(false);

    const buttons = [
      { key: 'flip', label: '↔', onClick: (go) => this._flip(go) },
      { key: 'tint', label: '🎨', onClick: (go) => this._cycleTint(go) },
      { key: 'back', label: '⬇', onClick: (go) => this._sendBack(go) },
      { key: 'front', label: '⬆', onClick: (go) => this._bringForward(go) },
      { key: 'delete', label: '✕', onClick: (go) => this._delete(go) },
    ];

    this.buttonObjects = buttons.map(({ key, label, onClick }, index) => {
      const x = index * (ACTION_BUTTON_SIZE + ACTION_BUTTON_GAP);
      const bg = this.scene.add
        .rectangle(x, 0, ACTION_BUTTON_SIZE, ACTION_BUTTON_SIZE, 0xffffff, 0.95)
        .setStrokeStyle(2, 0x6b4a1f)
        .setInteractive({ useHandCursor: true });
      const text = this.scene.add.text(x, 0, label, { fontSize: '28px' }).setOrigin(0.5);
      bg.on('pointerup', () => {
        if (this.selected) onClick(this.selected);
      });
      this.menu.add([bg, text]);
      return { key, bg };
    });
  }

  _select(go) {
    this.selected = go;
    const cam = this.scene.cameras.main;
    const count = this.buttonObjects.length;
    const totalWidth = count * ACTION_BUTTON_SIZE + (count - 1) * ACTION_BUTTON_GAP;
    // Clamp within the camera's current view, not the whole (possibly much larger) world —
    // the menu must stay on-screen wherever the player has panned to.
    const leftEdge = Phaser.Math.Clamp(go.x - totalWidth / 2, cam.scrollX + 10, cam.scrollX + GAME_WIDTH - totalWidth - 10);
    const menuX = leftEdge + ACTION_BUTTON_SIZE / 2; // container x aligns with button 0's local x = 0
    const menuY = Phaser.Math.Clamp(go.y - go.displayHeight - 50, cam.scrollY + 50, cam.scrollY + GAME_HEIGHT - 50);
    this.menu.setPosition(menuX, menuY);

    for (const { key, bg } of this.buttonObjects) {
      bg.setVisible(key !== 'tint' || go.tintable);
    }
    this.menu.setVisible(true);
  }

  deselect() {
    this.selected = null;
    this.menu.setVisible(false);
  }

  // --- per-item actions ---------------------------------------------------

  _flip(go) {
    this._snapshotForUndo();
    go.setFlipX(!go.flipX);
    this._persist();
  }

  _cycleTint(go) {
    this._snapshotForUndo();
    const currentIndex = TINT_PRESETS.indexOf(go.tintColor ?? null);
    const next = TINT_PRESETS[(currentIndex + 1) % TINT_PRESETS.length];
    go.tintColor = next;
    if (next == null) go.clearTint();
    else go.setTint(next);
    this._persist();
  }

  _bringForward(go) {
    this._snapshotForUndo();
    go.manualBias = (go.manualBias ?? 0) + 0.5;
    this._updateDepth(go);
    this._persist();
  }

  _sendBack(go) {
    this._snapshotForUndo();
    go.manualBias = (go.manualBias ?? 0) - 0.5;
    this._updateDepth(go);
    this._persist();
  }

  _delete(go) {
    this._snapshotForUndo();
    this._destroy(go);
    this._persist();
  }

  // --- persistence ----------------------------------------------------------

  _snapshotForUndo() {
    this.undoSnapshot = this.serializeLayout();
  }

  _persist() {
    this.onChange(this.serializeLayout());
  }
}
