/** Feature flags. Flip these as milestones are reached; game code must branch on them, never assume. */
export const ADS_ENABLED = false;
export const PAYMENTS_ENABLED = false;

/** Base game dimensions; Phaser's Scale Manager fits this to the device. */
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
