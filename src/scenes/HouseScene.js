import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { getHouse, getItemsForHouse } from '../systems/Catalog.js';
import { getHouseLayout, setHouseLayout } from '../systems/SaveManager.js';
import { DragDrop } from '../systems/DragDrop.js';
import { ItemDrawer } from '../ui/ItemDrawer.js';
import { HouseTopBar } from '../ui/HouseTopBar.js';

const ROOM_FIT_PADDING = 0.92; // fit a room/the whole house at 92% of the available space, leaving a little breathing room
const FOCUS_DURATION = 450; // ms, for the "gentle" camera snap
const STARTING_ROOM_ID = 'living_room'; // the green bottom-left room

/**
 * The whole game is this one scene: a camera over the full cutaway house image, starting
 * zoomed into one room and pannable (drag to scroll, snaps to the nearest room on release)
 * or zoomed out to the whole house via the top bar button. Room rectangles come from
 * catalog.json, measured against the actual background image (see scripts/measure-rooms.mjs).
 */
export class HouseScene extends Phaser.Scene {
  constructor() {
    super('House');
  }

  init(data) {
    this.houseId = data?.houseId ?? 'cottage_01';
    this.house = getHouse(this.houseId);
    this.items = getItemsForHouse();
    this.bgLoadFailed = false;
    this.currentRoomId = null; // null = whole-house view
  }

  preload() {
    this.load.image('house_world', `/${this.house.background}`);
    this.load.once('loaderror', (file) => {
      if (file.key === 'house_world') this.bgLoadFailed = true;
    });
    for (const item of this.items) {
      this.load.image(item.id, `/${item.sprite}`);
    }
  }

  create() {
    this.cameras.main.setBackgroundColor('#fff1f7');

    const hasWorld = !this.bgLoadFailed && this.textures.exists('house_world');
    if (hasWorld) {
      const source = this.textures.get('house_world').getSourceImage();
      this.worldWidth = source.width;
      this.worldHeight = source.height;
      this.add.image(this.worldWidth / 2, this.worldHeight / 2, 'house_world');
      this.rooms = this.house.rooms ?? [];
    } else {
      // No real background yet (SPEC.md rule 4): one placeholder "room" filling the whole world.
      this.worldWidth = GAME_WIDTH;
      this.worldHeight = GAME_HEIGHT;
      this.add
        .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH - 80, GAME_HEIGHT - 160, 0xffd27f)
        .setStrokeStyle(4, 0xcc9a3f);
      this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 200, `${this.house.name}\n(placeholder room — drop a real background at\n${this.house.background})`, {
          fontFamily: 'sans-serif',
          fontSize: '20px',
          color: '#6b4a1f',
          align: 'center',
        })
        .setOrigin(0.5);
      this.rooms = [{ id: 'placeholder', name: this.house.name, rect: { x: 40, y: 80, w: GAME_WIDTH - 80, h: GAME_HEIGHT - 160 } }];
    }

    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);

    this.dragDrop = new DragDrop(
      this,
      this.house,
      (layout) => setHouseLayout(this.houseId, layout),
      this.worldWidth,
      this.worldHeight,
    );
    this.dragDrop.loadLayout(getHouseLayout(this.houseId));
    this.dragDrop.onBackgroundPanEnd = () => this._snapToNearestRoom();

    this.topBar = new HouseTopBar({
      onWholeHouse: () => this._focusWholeHouse(),
      onUndo: () => this.dragDrop.undo(),
    });
    this.topBar.mount();

    this.drawer = new ItemDrawer(this.items, (item) => this._onItemTap(item));
    this.drawer.onToggle = () => this._refreshFraming();
    this.drawer.mount();

    const startRoom = this.rooms.find((r) => r.id === STARTING_ROOM_ID) ?? this.rooms[0];
    this._focusRoom(startRoom, false);

    this._setupPinchZoom();

    this.events.once('shutdown', () => this._cleanup());
  }

  // --- camera framing ---------------------------------------------------------

  /** Half the sidebar's current width, in game-logical units (0 if the sidebar is closed). */
  _sidebarWidthGameUnits() {
    if (!this.drawer.isOpen) return 0;
    const cssWidth = this.drawer.root.getBoundingClientRect().width;
    const cssPerGameUnit = this.scale.displaySize.width / GAME_WIDTH;
    return cssWidth / cssPerGameUnit;
  }

  _fitZoomFor(w, h) {
    const availableWidth = GAME_WIDTH - this._sidebarWidthGameUnits();
    const zoomX = availableWidth / w;
    const zoomY = GAME_HEIGHT / h;
    return Math.min(zoomX, zoomY) * ROOM_FIT_PADDING;
  }

  _applyFraming(centerX, centerY, zoom, animate) {
    const cam = this.cameras.main;
    // Shift the look-at point right by half the sidebar's width (in world units, at the new
    // zoom) so the room appears centred in the space actually visible beside the panel.
    const shift = this._sidebarWidthGameUnits() / 2 / zoom;
    const targetX = centerX + shift;
    if (animate) {
      cam.pan(targetX, centerY, FOCUS_DURATION, 'Sine.easeInOut');
      cam.zoomTo(zoom, FOCUS_DURATION, 'Sine.easeInOut');
    } else {
      cam.setZoom(zoom);
      cam.centerOn(targetX, centerY);
    }
  }

  _focusRoom(room, animate = true) {
    this.currentRoomId = room.id;
    const zoom = this._fitZoomFor(room.rect.w, room.rect.h);
    this._applyFraming(room.rect.x + room.rect.w / 2, room.rect.y + room.rect.h / 2, zoom, animate);
    this.topBar.setRoomName(room.name);
  }

  _focusWholeHouse(animate = true) {
    this.currentRoomId = null;
    const zoom = this._fitZoomFor(this.worldWidth, this.worldHeight);
    this._applyFraming(this.worldWidth / 2, this.worldHeight / 2, zoom, animate);
    this.topBar.setRoomName('Whole House');
  }

  /** Re-applies the current framing (room or whole-house) — called when the sidebar opens/closes. */
  _refreshFraming() {
    if (this.currentRoomId == null) this._focusWholeHouse();
    else {
      const room = this.rooms.find((r) => r.id === this.currentRoomId);
      if (room) this._focusRoom(room);
    }
  }

  _snapToNearestRoom() {
    const view = this.cameras.main.worldView;
    const viewCenterX = view.centerX;
    const viewCenterY = view.centerY;
    let nearest = this.rooms[0];
    let bestDist = Infinity;
    for (const room of this.rooms) {
      const cx = room.rect.x + room.rect.w / 2;
      const cy = room.rect.y + room.rect.h / 2;
      const d = Phaser.Math.Distance.Between(viewCenterX, viewCenterY, cx, cy);
      if (d < bestDist) {
        bestDist = d;
        nearest = room;
      }
    }
    this._focusRoom(nearest, true);
  }

  // --- pinch to zoom --------------------------------------------------------

  /** Two-finger pinch, clamped between "fit the whole house" and "fit the smallest room". */
  _setupPinchZoom() {
    this.input.addPointer(1); // the default pointer pool only tracks one touch; this adds a second

    this.minZoom = this._fitZoomFor(this.worldWidth, this.worldHeight);
    this.maxZoom = Math.max(...this.rooms.map((r) => this._fitZoomFor(r.rect.w, r.rect.h)));
    this._pinching = false;
    this._pinchStartDist = 0;
    this._pinchStartZoom = 1;

    this.input.on('pointerdown', () => this._tryStartPinch());
    this.input.on('pointermove', () => this._updatePinch());
    this.input.on('pointerup', () => this._endPinchIfNeeded());
    this.input.on('pointerupoutside', () => this._endPinchIfNeeded());
  }

  _activeTouchPointers() {
    return [this.input.pointer1, this.input.pointer2].filter((p) => p.isDown);
  }

  _tryStartPinch() {
    const pts = this._activeTouchPointers();
    if (pts.length !== 2) return;
    this._pinching = true;
    this.dragDrop.suspendDragging = true; // a single-finger drag may already be mid-gesture; stop it fighting the pinch
    this.dragDrop.deselect();
    this._pinchStartDist = Math.max(1, Phaser.Math.Distance.Between(pts[0].x, pts[0].y, pts[1].x, pts[1].y));
    this._pinchStartZoom = this.cameras.main.zoom;
  }

  _updatePinch() {
    if (!this._pinching) return;
    const pts = this._activeTouchPointers();
    if (pts.length !== 2) return;

    const cam = this.cameras.main;
    const midX = (pts[0].x + pts[1].x) / 2;
    const midY = (pts[0].y + pts[1].y) / 2;
    const worldBefore = cam.getWorldPoint(midX, midY);

    const dist = Phaser.Math.Distance.Between(pts[0].x, pts[0].y, pts[1].x, pts[1].y);
    const newZoom = Phaser.Math.Clamp((dist / this._pinchStartDist) * this._pinchStartZoom, this.minZoom, this.maxZoom);
    cam.setZoom(newZoom);

    // Re-anchor on the pinch midpoint so the point between your fingers stays put on screen,
    // instead of the zoom just happening around whatever the camera's centre was.
    const worldAfter = cam.getWorldPoint(midX, midY);
    cam.scrollX += worldBefore.x - worldAfter.x;
    cam.scrollY += worldBefore.y - worldAfter.y;
  }

  _endPinchIfNeeded() {
    if (this._pinching && this._activeTouchPointers().length < 2) {
      this._pinching = false;
      this.dragDrop.suspendDragging = false;
    }
  }

  // --- adding items -------------------------------------------------------

  _onItemTap(item) {
    const room = this.rooms.find((r) => r.id === this.currentRoomId) ?? this.rooms[0];
    const cx = room.rect.x + room.rect.w / 2;
    const cy = room.rect.y + room.rect.h / 2;
    this.dragDrop.placeNewItem(item.id, cx, cy, room.id);
  }

  _cleanup() {
    this.drawer.unmount();
    this.topBar.unmount();
  }
}
