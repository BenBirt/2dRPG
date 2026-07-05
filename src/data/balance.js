// Every gameplay tunable in one place so balancing passes touch one file.
export const TILE = 2; // world units per grid cell
export const STEP = 1.5; // world units of rise per elevation level

export const PLAYER = {
  speed: 6,
  radius: 0.42,
  scale: 0.55,
  turnRate: 14, // rad/s toward movement direction
  startHearts: 3, // hp is tracked in half-hearts: 3 hearts = 6 hp
  maxHeartsCap: 6,
  iframes: 1.0,
  attackDuration: 0.28,
  attackWindow: [0.05, 0.2], // seconds into the swing when the arc is live
  attackChainAfter: 0.16, // pressing attack after this point buffers the next swing
  attackRange: 2.1,
  attackArc: Math.PI / 3, // half-angle of the frontal sector
  attackDamage: 1,
  knockback: 9,
};

export const CAMERA = {
  fov: 42,
  offset: { x: 0, y: 13.5, z: 9.5 },
  followLerp: 6, // 1 - exp(-k*dt)
  roomLerp: 9,
  transitionTime: 0.45,
};

export const ENEMIES = {
  skeleton: {
    model: 'skeleton_minion',
    hp: 2,
    speed: 2.6,
    chaseSpeed: 3.6,
    radius: 0.42,
    scale: 0.55,
    aggroRange: 7,
    attackRange: 1.4,
    attackDamage: 1,
    attackCooldown: 1.1,
    touchDamage: 1,
  },
  skeleton_archer: {
    model: 'skeleton_rogue',
    hp: 2,
    speed: 2.4,
    radius: 0.42,
    scale: 0.55,
    aggroRange: 9,
    preferredRange: [4.5, 7.5],
    shootCooldown: 2.4,
    boltSpeed: 9,
    boltDamage: 1,
    touchDamage: 1,
  },
  skeleton_mage: {
    model: 'skeleton_mage',
    hp: 3,
    speed: 2.0,
    radius: 0.42,
    scale: 0.55,
    aggroRange: 10,
    shootCooldown: 3.0,
    boltSpeed: 5.5,
    boltHoming: 1.6, // rad/s steering
    boltDamage: 1,
    teleportRange: 2.2, // teleports away if player closes within this
    touchDamage: 1,
  },
};

export const ITEMS = {
  bow: {
    arrowSpeed: 16,
    arrowDamage: 1,
    maxArrows: 30,
    cooldown: 0.35,
  },
  bombs: {
    maxBombs: 8,
    fuse: 2.0,
    radius: 2.3,
    damage: 2,
    cooldown: 0.5,
  },
};

export const DROPS = {
  // weighted tables; null = no drop
  grass: [[0.72, null], [0.16, 'heart'], [0.12, 'rupee']],
  pot: [[0.45, null], [0.25, 'heart'], [0.2, 'rupee'], [0.05, 'arrows5'], [0.05, 'bomb1']],
  enemy: [[0.5, null], [0.22, 'heart'], [0.18, 'rupee'], [0.05, 'arrows5'], [0.05, 'bomb1']],
};

export const PICKUPS = {
  heart: { heal: 2 },
  rupee: { rupees: 1 },
  rupee5: { rupees: 5 },
  arrows5: { arrows: 5 },
  bomb1: { bombs: 1 },
};
