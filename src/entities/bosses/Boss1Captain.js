import { BossBase } from './BossBase.js';
import { createEnemy } from '../enemies/Skeletons.js';

const CFG = {
  model: 'skeleton_warrior',
  hp: 8,
  speed: 2.2,
  chaseSpeed: 3.0,
  radius: 0.7,
  scale: 1.0,
  aggroRange: 30,
  attackRange: 2.1,
  attackDamage: 2,
  touchDamage: 1,
};

// Boss 1 — the Skeleton Captain. A pure sword duel: slow stalk, a telegraphed
// three-swing combo, then a long recovery (the punish window). Summons two
// minions at 2/3 and 1/3 health.
export class Boss1Captain extends BossBase {
  constructor(game, x, z) {
    super(game, x, z, CFG);
    this.combo = 0;
    this.summonsLeft = [Math.ceil(CFG.hp * 2 / 3), Math.ceil(CFG.hp / 3)];
  }

  takeHit(hit) {
    const ok = super.takeHit(hit);
    if (ok && this.alive && this.summonsLeft.length && this.hp <= this.summonsLeft[0]) {
      this.summonsLeft.shift();
      this._summon();
    }
    return ok;
  }

  _summon() {
    this.setState('summon', 'Taunt', { once: true, duration: 1.0 });
    this.game.events.emit('sfx', 'summon');
    const world = this.game.world;
    for (const off of [[-2.2, 0], [2.2, 0]]) {
      const x = this.x + off[0];
      const z = this.z + off[1];
      if (world.collision.circleHitsSolid(x, z, 0.42)) continue;
      const minion = createEnemy(this.game, 'skeleton', x, z);
      minion.roomId = this.roomId;
      world.addEntity(minion);
    }
  }

  _think(dt) {
    const p = this.player;
    if (!p?.alive) return;

    switch (this.state) {
      case 'idle':
        this.setState('chase', 'Walking_A');
        break;

      case 'summon':
        if (this.stateTime > 1.0) this.setState('chase', 'Walking_A');
        break;

      case 'chase': {
        const d = this.playerDist();
        if (d <= CFG.attackRange && this.attackCooldown <= 0) {
          this.combo = 0;
          this._swing();
        } else {
          this.moveToward(p.x, p.z, this.hp <= CFG.hp / 2 ? CFG.chaseSpeed : CFG.speed, dt);
        }
        break;
      }

      case 'attack':
        this._attackTick(dt);
        break;

      case 'recover':
        // the punish window: stands still, vulnerable
        if (this.stateTime > 1.5) {
          this.attackCooldown = 0.6;
          this.setState('chase', 'Walking_A');
        }
        break;
    }
  }

  _swing() {
    const anims = ['2H_Melee_Attack_Slice', '2H_Melee_Attack_Chop', '2H_Melee_Attack_Spin'];
    this.setState('attack', anims[this.combo % anims.length], { once: true, duration: 0.62 });
    this._didHit = false;
    this.game.events.emit('sfx', 'boss_swing');
  }

  _attackTick(dt) {
    const p = this.player;
    // track the player slowly during windup so the combo can be sidestepped
    if (this.stateTime < 0.25 && p?.alive) {
      this.faceToward(p.x - this.x, p.z - this.z, dt, 2.4);
    }
    if (!this._didHit && this.stateTime >= 0.3 && this.stateTime <= 0.45 && p?.alive) {
      const f = this.facingVec();
      const dx = p.x - this.x;
      const dz = p.z - this.z;
      const d = Math.hypot(dx, dz);
      const arc = this.combo === 2 ? -1 : 0.35; // final spin hits all around
      if (d < CFG.attackRange + 0.5 && (d < 0.1 || (dx * f.x + dz * f.z) / d > arc)) {
        const k = d > 0.01 ? 11 / d : 0;
        p.takeHit({ damage: CFG.attackDamage, knockX: dx * k, knockZ: dz * k, source: this });
        this._didHit = true;
      }
    }
    if (this.stateTime >= 0.62) {
      this.combo++;
      if (this.combo < 3 && this.playerDist() < CFG.attackRange + 1.6) {
        this._swing();
      } else {
        this.setState('recover', '2H_Melee_Idle');
      }
    }
  }
}
