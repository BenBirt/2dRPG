import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { Assets } from '../../core/Assets.js';
import { Entity, AnimController } from '../Entity.js';
import { DROPS } from '../../data/balance.js';
import { enableShadows } from '../../world/Procedural.js';

// Base enemy: IDLE / WANDER / CHASE / ATTACK / HURT / DEAD state machine.
// Subclasses override _think (chase/attack behavior) and _attack.
export class Enemy extends Entity {
  constructor(game, x, z, cfg) {
    super(game, x, z);
    this.cfg = cfg;
    this.radius = cfg.radius;
    this.hp = this.maxHp = cfg.hp;
    this.hittable = true;
    this.friendly = false;

    const gltf = Assets.get(cfg.model);
    const model = cloneSkinned(gltf.scene);
    model.scale.setScalar(cfg.scale);
    enableShadows(model, { receive: false });
    this.mesh = new THREE.Group();
    this.mesh.add(model);
    this.model = model;
    this.anim = new AnimController(model, gltf.animations);

    this.state = 'idle';
    this.stateTime = 0;
    this.wanderDir = Math.random() * Math.PI * 2;
    this.attackCooldown = 0;
    this.spawned = false;
    this.deathTime = 0;
    this.syncMesh();
  }

  get player() {
    return this.game.player;
  }

  setState(state, anim = null, animOpts = {}) {
    this.state = state;
    this.stateTime = 0;
    if (anim && this.anim.has(anim)) this.anim.play(anim, animOpts);
  }

  playerDist() {
    return this.player ? this.distanceTo(this.player) : Infinity;
  }

  seesPlayer(range) {
    if (!this.player || !this.player.alive) return false;
    if (this.playerDist() > range) return false;
    return this.game.world.collision.hasLineOfSight(this.x, this.z, this.player.x, this.player.z);
  }

  moveToward(tx, tz, speed, dt) {
    const dx = tx - this.x;
    const dz = tz - this.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.05) return true;
    const res = this.game.world.collision.moveCircle(
      this.pos.x, this.pos.z, this.radius,
      (dx / d) * speed * dt, (dz / d) * speed * dt
    );
    const blocked = res.hitX && res.hitZ;
    this.pos.x = res.x;
    this.pos.z = res.z;
    this.faceToward(dx, dz, dt, 10);
    return blocked;
  }

  update(dt) {
    super.update(dt);
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.stateTime += dt;

    if (!this.spawned) {
      this.spawned = true;
      if (this.anim.has('Skeletons_Awaken_Standing')) {
        this.setState('spawning', 'Skeletons_Awaken_Standing', {
          once: true, duration: 0.9, onDone: () => this.setState('idle', 'Idle'),
        });
      } else {
        this.setState('idle', 'Idle');
      }
    }

    if (this.state === 'dead') {
      this.deathTime += dt;
      this.pos.y = Math.min(0, this.pos.y); // stay grounded
      if (this.deathTime > 1.3) this.removed = true;
      this.syncMesh();
      return;
    }

    this.applyKnockback(dt, this.game.world.collision);

    if (this.state !== 'spawning' && this.state !== 'hurt') {
      this._think(dt);
    } else if (this.state === 'hurt' && this.stateTime > 0.35) {
      this.setState('chase', 'Running_A');
    }

    this._touchDamage();
    this.updateBlink();
    this.syncMesh();
  }

  _touchDamage() {
    const p = this.player;
    if (!p || !p.alive || !this.cfg.touchDamage) return;
    const d = this.playerDist();
    if (d < this.radius + p.radius + 0.05) {
      const dx = p.x - this.x;
      const dz = p.z - this.z;
      const k = d > 0.01 ? 8 / d : 0;
      p.takeHit({ damage: this.cfg.touchDamage, knockX: dx * k, knockZ: dz * k, source: this });
    }
  }

  // Default ground enemy brain; subclasses replace this wholesale.
  _think(dt) {
    const cfg = this.cfg;
    switch (this.state) {
      case 'idle':
        if (this.seesPlayer(cfg.aggroRange)) {
          this.setState('chase', 'Running_A');
        } else if (this.stateTime > 1.2 + Math.random()) {
          this.wanderDir = Math.random() * Math.PI * 2;
          this.setState('wander', 'Walking_A');
        }
        break;

      case 'wander': {
        const dx = Math.sin(this.wanderDir);
        const dz = Math.cos(this.wanderDir);
        const res = this.game.world.collision.moveCircle(
          this.pos.x, this.pos.z, this.radius, dx * cfg.speed * dt, dz * cfg.speed * dt
        );
        if (res.hitX || res.hitZ) this.wanderDir = Math.random() * Math.PI * 2;
        this.pos.x = res.x;
        this.pos.z = res.z;
        this.faceToward(dx, dz, dt, 8);
        if (this.seesPlayer(cfg.aggroRange)) this.setState('chase', 'Running_A');
        else if (this.stateTime > 1.6) this.setState('idle', 'Idle');
        break;
      }

      case 'chase': {
        const d = this.playerDist();
        if (d > cfg.aggroRange * 1.6 || !this.player?.alive) {
          this.setState('idle', 'Idle');
        } else if (d <= cfg.attackRange && this.attackCooldown <= 0) {
          this._attack();
        } else {
          this.moveToward(this.player.x, this.player.z, cfg.chaseSpeed ?? cfg.speed, dt);
        }
        break;
      }

      case 'attack':
        this._attackTick(dt);
        break;
    }
  }

  _attack() {
    const anim = this.anim.has('1H_Melee_Attack_Slice_Horizontal')
      ? '1H_Melee_Attack_Slice_Horizontal' : 'Unarmed_Melee_Attack_Punch_A';
    this.setState('attack', anim, { once: true, duration: 0.55 });
    this._didHit = false;
  }

  _attackTick() {
    if (!this._didHit && this.stateTime >= 0.25 && this.stateTime <= 0.4) {
      const f = this.facingVec();
      const p = this.player;
      if (p?.alive) {
        const dx = p.x - this.x;
        const dz = p.z - this.z;
        const d = Math.hypot(dx, dz);
        if (d < this.cfg.attackRange + 0.3 && (d < 0.1 || (dx * f.x + dz * f.z) / d > 0.4)) {
          const k = d > 0.01 ? 9 / d : 0;
          p.takeHit({ damage: this.cfg.attackDamage, knockX: dx * k, knockZ: dz * k, source: this });
          this._didHit = true;
        }
      }
    }
    if (this.stateTime >= 0.6) {
      this.attackCooldown = this.cfg.attackCooldown ?? 1.2;
      this.setState('chase', 'Running_A');
    }
  }

  onHurt() {
    this.setState('hurt', 'Hit_A', { once: true });
    this.game.events.emit('sfx', 'enemy_hurt');
  }

  die() {
    this.alive = false;
    this.hittable = false;
    this.setState('dead', 'Death_A', { once: true });
    this.game.events.emit('sfx', 'enemy_die');
    this.game.events.emit('enemy-died', this);
    this.game.world.spawnDrop(this.x, this.z, DROPS.enemy);
  }
}
