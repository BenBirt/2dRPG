// Unified input state fed by Keyboard and Touch sources. Gameplay code reads
// only this object, never raw events.
const ACTIONS = ['attack', 'item', 'cycle', 'pause'];

export class Input {
  constructor() {
    this.moveX = 0; // -1..1
    this.moveY = 0; // -1..1 (positive = down/south)
    this.held = {};
    this.pressed = {}; // true for the single frame after a press
    this._queued = {};
    for (const a of ACTIONS) {
      this.held[a] = false;
      this.pressed[a] = false;
      this._queued[a] = false;
    }
    this.sources = [];
  }

  addSource(source) {
    this.sources.push(source);
  }

  press(action) {
    this._queued[action] = true;
    this.held[action] = true;
  }

  release(action) {
    this.held[action] = false;
  }

  // Called once per frame before game update.
  update() {
    let x = 0;
    let y = 0;
    for (const s of this.sources) {
      x += s.moveX || 0;
      y += s.moveY || 0;
    }
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    this.moveX = x;
    this.moveY = y;

    for (const a of ACTIONS) {
      this.pressed[a] = this._queued[a];
      this._queued[a] = false;
    }
  }

  justPressed(action) {
    return this.pressed[action];
  }

  isHeld(action) {
    return this.held[action];
  }
}
