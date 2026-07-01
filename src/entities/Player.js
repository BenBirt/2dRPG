import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { Assets } from '../core/Assets.js';
import { Entity, AnimController } from './Entity.js';
import { PLAYER } from '../data/balance.js';
import { enableShadows } from '../world/Procedural.js';

const ANIM = {
  idle: 'Idle',
  run: 'Running_A',
  attack: '1H_Melee_Attack_Slice_Horizontal',
  attackAlt: '1H_Melee_Attack_Chop',
  shoot: '1H_Ranged_Shoot',
  throw: 'Throw',
  hurt: 'Hit_A',
  death: 'Death_A',
  pickup: 'PickUp',
  cheer: 'Cheer',
  interact: 'Interact',
};

export class Player extends Entity {
  constructor(game, x, z) {
    super(game, x, z);
    this.radius = PLAYER.radius;
    this.hittable = true;
    this.friendly = true;
    this.state = 'idle'; // idle | move | attack | item | hurt | dead | scripted
    this.stateTime = 0;
    this.attackHitSet = null;
    this.itemCooldown = 0;

    const gltf = Assets.get('knight');
    const model = cloneSkinned(gltf.scene);
    model.scale.setScalar(PLAYER.scale);
    enableShadows(model, { receive: false });
    this.mesh = new THREE.Group();
    this.mesh.add(model);
    this.anim = new AnimController(model, gltf.animations);
    this.anim.play(ANIM.idle);
    this.syncMesh();
    this._ready = true;
  }

  get progress() {
    return this.game.progress;
  }

  // hp lives in game.progress so saving/loading is trivial. The _ready guard
  // keeps the Entity constructor's default assignments from clobbering it.
  get hp() { return this.game?.progress?.hearts ?? 6; }
  set hp(v) { if (this._ready) this.game.progress.hearts = Math.max(0, v); }
  get maxHp() { return (this.game?.progress?.maxHearts ?? 3) * 2; }
  set maxHp(_) {}

  update(dt) {
    super.update(dt);
    this.stateTime += dt;
    this.itemCooldown = Math.max(0, this.itemCooldown - dt);
    const input = this.game.input;
    const collision = this.game.world.collision;

    this.applyKnockback(dt, collision);

    switch (this.state) {
      case 'idle':
      case 'move': {
        const mx = input.moveX;
        const mz = input.moveY;
        const moving = Math.hypot(mx, mz) > 0.12;
        if (moving) {
          const res = collision.moveCircle(
            this.pos.x, this.pos.z, this.radius,
            mx * PLAYER.speed * dt, mz * PLAYER.speed * dt
          );
          this.pos.x = res.x;
          this.pos.z = res.z;
          this.faceToward(mx, mz, dt, PLAYER.turnRate);
          if (this.state !== 'move') {
            this.state = 'move';
            this.anim.play(ANIM.run);
          }
        } else if (this.state !== 'idle') {
          this.state = 'idle';
          this.anim.play(ANIM.idle);
        }

        if (input.justPressed('attack')) {
          const target = this.game.world.interactableNear(this);
          if (target) {
            target.interact(this);
          } else {
            this._startAttack();
          }
        } else if (input.justPressed('item')) {
          this._useItem();
        }
        break;
      }

      case 'attack': {
        const [w0, w1] = PLAYER.attackWindow;
        if (this.stateTime >= w0 && this.stateTime <= w1) {
          this._sweepAttack();
        }
        if (this.stateTime >= PLAYER.attackDuration) {
          this._toIdle();
        }
        break;
      }

      case 'item': {
        if (this.stateTime >= 0.32) this._toIdle();
        break;
      }

      case 'hurt': {
        if (this.stateTime >= 0.3) this._toIdle();
        break;
      }

      case 'dead':
      case 'scripted':
        break;
    }

    this.updateBlink();
    this.syncMesh();
  }

  _toIdle() {
    this.state = 'idle';
    this.stateTime = 0;
    this.anim.play(ANIM.idle);
  }

  _startAttack() {
    this.state = 'attack';
    this.stateTime = 0;
    this.attackHitSet = new Set();
    this.anim.play(Math.random() < 0.5 ? ANIM.attack : ANIM.attackAlt, {
      once: true, duration: PLAYER.attackDuration,
    });
    this.game.events.emit('sfx', 'sword');
  }

  _sweepAttack() {
    const f = this.facingVec();
    this.game.world.sweepSector(
      this, f, PLAYER.attackRange, PLAYER.attackArc,
      {
        damage: PLAYER.attackDamage,
        knockback: PLAYER.knockback,
        source: this,
        hitSet: this.attackHitSet,
      }
    );
  }

  _useItem() {
    if (this.itemCooldown > 0) return;
    const p = this.progress;
    if (p.equipped === 'bow' && p.hasBow) {
      this.game.world.shootArrow(this);
    } else if (p.equipped === 'bombs' && p.hasBombs) {
      this.game.world.placeBomb(this);
    }
  }

  onHurt() {
    this.state = 'hurt';
    this.stateTime = 0;
    this.anim.play(ANIM.hurt, { once: true });
    this.game.events.emit('sfx', 'player_hurt');
    this.game.events.emit('hearts-changed');
  }

  die() {
    if (this.state === 'dead') return;
    this.alive = false;
    this.state = 'dead';
    this.stateTime = 0;
    this.anim.play(ANIM.death, { once: true });
    this.game.events.emit('hearts-changed');
    this.game.events.emit('player-died');
  }

  takeHit(hit) {
    if (this.state === 'dead' || this.game.state !== 'PLAYING') return false;
    const accepted = super.takeHit({ ...hit, iframes: PLAYER.iframes });
    return accepted;
  }

  heal(halves) {
    const p = this.progress;
    p.hearts = Math.min(p.maxHearts * 2, p.hearts + halves);
    this.game.events.emit('hearts-changed');
  }

  // Scripted animation control for cutscenes/item-gets.
  playScripted(name, opts) {
    this.state = 'scripted';
    this.stateTime = 0;
    return this.anim.play(ANIM[name] ?? name, opts);
  }

  releaseScripted() {
    this._toIdle();
  }
}
