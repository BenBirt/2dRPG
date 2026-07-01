// requestAnimationFrame loop with clamped variable timestep.
// dt is capped so a backgrounded tab or hitchy phone never produces a step
// large enough to tunnel entities through 2-unit tiles.
const MAX_DT = 0.05;

export class Loop {
  constructor(update, render) {
    this.update = update;
    this.render = render;
    this.last = 0;
    this.running = false;
    this._tick = this._tick.bind(this);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame(this._tick);
  }

  stop() {
    this.running = false;
  }

  _tick(now) {
    if (!this.running) return;
    const dt = Math.min((now - this.last) / 1000, MAX_DT);
    this.last = now;
    this.update(dt);
    this.render();
    requestAnimationFrame(this._tick);
  }
}
