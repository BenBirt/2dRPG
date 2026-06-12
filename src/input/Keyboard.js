// Keyboard source: WASD/arrows to move; Space/J attack+interact; K/X item;
// Tab/I cycle item; Esc/P pause.
const KEY_ACTIONS = {
  Space: 'attack',
  KeyJ: 'attack',
  Enter: 'attack',
  KeyK: 'item',
  KeyX: 'item',
  Tab: 'cycle',
  KeyI: 'cycle',
  Escape: 'pause',
  KeyP: 'pause',
};

export class Keyboard {
  constructor(input) {
    this.input = input;
    this.keys = new Set();
    this.moveX = 0;
    this.moveY = 0;

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (KEY_ACTIONS[e.code] || e.code.startsWith('Arrow') || e.code === 'Tab') e.preventDefault();
      this.keys.add(e.code);
      const action = KEY_ACTIONS[e.code];
      if (action) input.press(action);
      this._updateAxes();
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      const action = KEY_ACTIONS[e.code];
      if (action) input.release(action);
      this._updateAxes();
    });

    window.addEventListener('blur', () => {
      this.keys.clear();
      for (const action of new Set(Object.values(KEY_ACTIONS))) input.release(action);
      this._updateAxes();
    });
  }

  _updateAxes() {
    const k = this.keys;
    let x = 0;
    let y = 0;
    if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
    if (k.has('KeyW') || k.has('ArrowUp')) y -= 1;
    if (k.has('KeyS') || k.has('ArrowDown')) y += 1;
    if (x && y) {
      const inv = 1 / Math.SQRT2;
      x *= inv;
      y *= inv;
    }
    this.moveX = x;
    this.moveY = y;
  }
}
