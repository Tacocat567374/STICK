// Round replays: every session feeds frames into a rolling buffer, and when a
// round ends the buffer freezes into a clip the player can re-watch and export.

import { SnapshotView } from './snapshot';

const HZ = 20;
const MAX_FRAMES = HZ * 22; // keep the last ~22 seconds of the round

export class ReplayRecorder {
  constructor() {
    this.roll = [];
    this.frozen = null;
  }

  push(frame) {
    if (!frame) return;
    const live = frame.st === 'fight' || frame.st === 'countdown';
    if (live) {
      this.roll.push(frame);
      if (this.roll.length > MAX_FRAMES) this.roll.splice(0, this.roll.length - MAX_FRAMES);
    } else if (!this.frozen && this.roll.length > 8) {
      // The round just ended — keep the finish as a clip until the next one ends.
      this.frozen = { frames: this.roll.slice(), arenaIndex: this.roll[0].a, mode: this.roll[0].md };
      this.roll = [];
    }
  }

  clip() {
    return this.frozen;
  }
}

export class ReplaySession {
  constructor(clip) {
    this.frames = clip.frames;
    this.view = new SnapshotView();
    this.t = 0;
    this.i = 0;
    this.done = false;
    this.paused = false;
    this.view.applySnapshot(this.frames[0]);
  }

  setInput() {}

  setPaused(v) {
    this.paused = !!v;
  }

  restart() {
    this.t = 0;
    this.i = 0;
    this.done = false;
    this.paused = false;
    this.view = new SnapshotView();
    this.view.applySnapshot(this.frames[0]);
  }

  tick(dt) {
    if (!this.paused && !this.done) {
      this.t += dt;
      const last = this.frames.length - 1;
      const idx = Math.min(last, Math.floor(this.t * HZ));
      for (let k = this.i + 1; k <= idx; k++) this.view.applySnapshot(this.frames[k]);
      this.i = Math.max(this.i, idx);
      if (this.i >= last) this.done = true;
    }
    this.view.advance(dt);
  }

  scene() {
    return this.view.scene();
  }

  hud() {
    const last = this.frames.length - 1;
    return {
      ...this.view.hud(),
      progress: last > 0 ? this.i / last : 1,
      done: this.done,
    };
  }
}