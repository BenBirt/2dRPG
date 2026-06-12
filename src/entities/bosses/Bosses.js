import { Boss1Captain } from './Boss1Captain.js';
import { Boss2Eye } from './Boss2Eye.js';
import { Boss3Colossus } from './Boss3Colossus.js';

// Boss2Eye and Boss3Colossus land with dungeons 2 and 3.
const REGISTRY = {
  boss1: Boss1Captain,
  boss2: Boss2Eye,
  boss3: Boss3Colossus,
};

export function registerBoss(type, cls) {
  REGISTRY[type] = cls;
}

export function createBoss(game, type, x, z) {
  const Cls = REGISTRY[type];
  if (!Cls) throw new Error(`Unknown boss type: ${type}`);
  return new Cls(game, x, z);
}
