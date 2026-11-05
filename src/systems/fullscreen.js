/**
 * Requests fullscreen and locks to landscape when entering the house.
 * Must be called synchronously from inside a real click/pointerup handler —
 * browsers reject both APIs once the call is no longer tied to a user gesture
 * (e.g. after an `await` or a Phaser asset-load completes). Both requests are
 * best-effort: iOS Safari in particular supports neither reliably, so failures
 * are swallowed rather than surfaced to the player.
 */
export function enterFullscreenLandscape() {
  const el = document.documentElement;
  if (!document.fullscreenElement && el.requestFullscreen) {
    el.requestFullscreen().catch(() => {});
  }
  if (screen.orientation?.lock) {
    screen.orientation.lock('landscape').catch(() => {});
  }
}
