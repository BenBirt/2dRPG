import { Enemy } from './Enemy.js';
import { EnemyBolt } from '../projectiles/EnemyBolt.js';
import { ENEMIES, TILE } from '../../data/balance.js';

// Melee chaser — the base Enemy brain is exactly this.
export class Skeleton extends Enemy {
  constructor(game, x, z) {
    super(game, x, z, ENEMIES.skeleton);
  }
}

// Kiting crossbow skeleton: keeps distance, fires straight bolts.
export class SkeletonArcher extends Enemy {
  constructor(game, x, z) {
    super(game, x, z, ENEMIES.skeleton_archer);
    this.shootTimer = 1.2;
  }

  _think(dt) {
    const cfg = this.cfg;
    const p = this.player;
    if (this.state === 'attack') {
      if (this.stateTime > 0.7) this.setState('chase', 'Walking_A');
      return;
    }
    if (!this.seesPlayer(cfg.aggroRange)) {
      if (this.state !== 'idle') this.setState('idle', 'Idle');
      return;
    }
    if (this.state === 'idle' || this.state === 'wander') this.setState('chase', 'Walking_A');

    const d = this.playerDist();
    const [min, max] = cfg.preferredRange;
    if (d < min) {
      // back away from the player
      const ax = this.x + (this.x - p.x);
      const az = this.z + (this.z - p.z);
      this.moveToward(ax, az, cfg.speed, dt);
      this.faceToward(p.x - this.x, p.z - this.z, dt, 12);
    } else if (d > max) {
      this.moveToward(p.x, p.z, cfg.speed, dt);
    } else {
      this.faceToward(p.x - this.x, p.z - this.z, dt, 12);
    }

    this.shootTimer -= dt;
    if (this.shootTimer <= 0 && d >= min * 0.6 && d <= max * 1.3) {
      this.shootTimer = cfg.shootCooldown;
      const anim = this.anim.has('2H_Ranged_Shoot') ? '2H_Ranged_Shoot' : '1H_Ranged_Shoot';
      this.setState('attack', anim, { once: true, duration: 0.6 });
      const dx = p.x - this.x;
      const dz = p.z - this.z;
      this.game.world.addEntity(new EnemyBolt(this.game, this, this.x, this.z, dx, dz, {
        speed: cfg.boltSpeed, damage: cfg.boltDamage,
      }));
      this.game.events.emit('sfx', 'bolt');
    }
  }
}

// Teleporting mage: lobs slow homing bolts, blinks away when crowded.
export class SkeletonMage extends Enemy {
  constructor(game, x, z) {
    super(game, x, z, ENEMIES.skeleton_mage);
    this.shootTimer = 1.6;
  }

  _teleport() {
    const col = this.game.world.collision;
    for (let tries = 0; tries < 24; tries++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 4 + Math.random() * 3.5;
      const nx = this.player.x + Math.sin(ang) * dist;
      const nz = this.player.z + Math.cos(ang) * dist;
      if (!col.circleHitsSolid(nx, nz, this.radius)) {
        this.pos.x = nx;
        this.pos.z = nz;
        this.game.events.emit('sfx', 'teleport');
        this.iframes = Math.max(this.iframes, 0.4);
        return;
      }
    }
  }

  _think(dt) {
    const cfg = this.cfg;
    const p = this.player;
    if (this.state === 'attack') {
      if (this.stateTime > 0.8) this.setState('chase', 'Walking_A');
      return;
    }
    if (!this.seesPlayer(cfg.aggroRange)) {
      if (this.state !== 'idle') this.setState('idle', 'Idle');
      return;
    }
    if (this.state === 'idle' || this.state === 'wander') this.setState('chase', 'Walking_A');

    const d = this.playerDist();
    if (d < cfg.teleportRange) {
      this._teleport();
      return;
    }
    if (d > 7) this.moveToward(p.x, p.z, cfg.speed, dt);
    else this.faceToward(p.x - this.x, p.z - this.z, dt, 10);

    this.shootTimer -= dt;
    if (this.shootTimer <= 0) {
      this.shootTimer = cfg.shootCooldown;
      this.setState('attack', 'Spellcast_Shoot', { once: true, duration: 0.8 });
      const dx = p.x - this.x;
      const dz = p.z - this.z;
      this.game.world.addEntity(new EnemyBolt(this.game, this, this.x, this.z, dx, dz, {
        speed: cfg.boltSpeed, damage: cfg.boltDamage, homing: cfg.boltHoming,
      }));
      this.game.events.emit('sfx', 'magic');
    }
  }
}

export function createEnemy(game, type, x, z) {
  switch (type) {
    case 'skeleton': return new Skeleton(game, x, z);
    case 'skeleton_archer': return new SkeletonArcher(game, x, z);
    case 'skeleton_mage': return new SkeletonMage(game, x, z);
    default: throw new Error(`Unknown enemy type: ${type}`);
  }
}
