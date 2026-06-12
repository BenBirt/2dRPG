import { Boss1Captain } from './Boss1Captain.js';

// Boss2Eye and Boss3Colossus land with dungeons 2 and 3.
const REGISTRY = {
  boss1: Boss1Captain,
};

export function registerBoss(type, cls) {
  REGISTRY[type] = cls;
}

export function createBoss(game, type, x, z) {
  const Cls = REGISTRY[type];
  if (!Cls) throw new Error(`Unknown boss type: ${type}`);
  return new Cls(game, x, z);
}
