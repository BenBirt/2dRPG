// Minimal pub/sub used to decouple gameplay from UI (HUD, audio, menus).
export class Events {
  constructor() {
    this.listeners = new Map();
  }

  on(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(fn);
    return () => this.off(type, fn);
  }

  off(type, fn) {
    this.listeners.get(type)?.delete(fn);
  }

  emit(type, payload) {
    const set = this.listeners.get(type);
    if (!set) return;
    for (const fn of [...set]) fn(payload);
  }
}

// Shared global bus; systems may also create private Events instances.
export const bus = new Events();
