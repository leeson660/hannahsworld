import Phaser from 'phaser';

/** Shared bus between the DOM item drawer and the active Phaser scene, since they can't call each other directly. */
export const gameEvents = new Phaser.Events.EventEmitter();
