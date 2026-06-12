import * as THREE from 'three';
import { BossBase } from './BossBase.js';
import { Entity } from '../Entity.js';

const CFG = {
  model: 'skeleton_warrior',
  hp: 12,
  speed: 1.6,
  radius: 0.85,
  scale: 1.5,
  aggroRange: 30,
  attackRange: 0,
  touchDamage: 2,
};

// ── Shockwave ring ────────────────────────────────────────────────────────────
// A flat torus that expands outward from the boss. Deals damage when the player
// is at the right distance. Private helper used only by Boss3Colossus.
class Shockwave extends Entity {
  constructor(game, x, z) {
    super(game, x, z);
    this.radius = 0.5; // current ring radius (grows over time)
    this._maxRadius = 5.5;
    this._duration = 1.1;
    this._elapsed = 0;
    this._hitPlayer = false;
    this.hittable = false;
    this.friendly = false;

    const geo = new THREE.TorusGeometry(0.5, 0.18, 8, 32);
    // Rotate so the torus lies flat on the ground (torus is vertical by default)
    geo.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2));
    const mat = new THREE.MeshStandardMaterial({
      color: 0xff6622,
      emissive: 0xff4400,
      emissiveIntensity: 1.4,
      roughness: 0.5,
      transparent: true,
      opacity: 0.85,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.set(x, 0.08, z);
  }

  update(dt) {
    super.update(dt);
    this._elapsed += dt;

    const t = Math.min(this._elapsed / this._duration, 1);
    this.radius = 0.5 + (this._maxRadius - 0.5) * t;

    // Scale the mesh to match
    this.mesh.scale.setScalar(this.radius / 0.5);

    // Fade out near the end
    if (this.mesh.material) {
      this.mesh.material.opacity = 0.85 * (1 - Math.max(0, (t - 0.7) / 0.3));
    }

    // Damage check
    if (!this._hitPlayer) {
      const p = this.game.player;
      if (p?.alive) {
        const dist = Math.hypot(p.x - this.pos.x, p.z - this.pos.z);
        if (Math.abs(dist - this.radius) < 0.5) {
          const dx = p.x - this.pos.x;
          const dz = p.z - this.pos.z;
          const d = Math.hypot(dx, dz);
          const k = d > 0.01 ? 8 / d : 0;
          p.takeHit({ damage: 2, knockX: dx * k, knockZ: dz * k, source: this });
          this._hitPlayer = true;
        }
      }
    }

    if (this._elapsed >= this._duration) {
      this.removed = true;
    }
  }
}

// ── Boss 3 — The Bone Colossus ────────────────────────────────────────────────
// Armored juggernaut. Bomb explosions strip the armor for 7 s; a wall-charge
// self-stuns for 3 s (also a vulnerability window for swords).
export class Boss3Colossus extends BossBase {
  constructor(game, x, z) {
    super(game, x, z, CFG);
    this.homeX = x;
    this.homeZ = z;

    this.armored = true;
    this._armorTimer = 0;       // counts down when armor is stripped
    this._attackTimer = 4.0;    // time until next attack choice
    this._chargeDirX = 0;
    this._chargeDirZ = 0;
    this._chargeHitPlayer = false;
    this._stunned = false;
    this._deniedTimer = 0;

    // Phase 2 flags (below 50% hp)
    this._phase2 = false;
    this._secondWaveTimer = 0;
    this._pendingSecondWave = false;
  }

  // ── Phase helper ────────────────────────────────────────────────────────────

  _checkPhase() {
    if (!this._phase2 && this.hp <= CFG.hp / 2) {
      this._phase2 = true;
    }
  }

  // ── State machine ────────────────────────────────────────────────────────────

  _think(dt) {
    const p = this.player;
    if (!p?.alive) return;

    this._checkPhase();
    this._deniedTimer = Math.max(0, this._deniedTimer - dt);

    // Armor regeneration timer
    if (!this.armored && this._armorTimer > 0) {
      this._armorTimer -= dt;
      if (this._armorTimer <= 0) {
        this.armored = true;
      }
    }

    switch (this.state) {
      case 'idle':
        this.setState('stalk', 'Walking_A');
        break;

      case 'stalk': {
        const speed = this._phase2 ? 2.2 : CFG.speed;
        this.moveToward(p.x, p.z, speed, dt);

        this._attackTimer -= dt;
        const interval = this._phase2 ? 2.8 : 4.0;
        if (this._attackTimer <= 0) {
          this._attackTimer = interval;
          this._pickAttack();
        }
        break;
      }

      case 'slam':
        if (this.stateTime > 0.8) {
          this.setState('stalk', 'Walking_A');
        }
        break;

      case 'slam_wait':
        // Waiting for second shockwave in phase 2
        this._secondWaveTimer -= dt;
        if (this._secondWaveTimer <= 0 && this._pendingSecondWave) {
          this._pendingSecondWave = false;
          this._spawnShockwave();
          this.setState('slam', '2H_Melee_Attack_Chop', { once: true, duration: 0.8 });
        }
        break;

      case 'taunt':
        // Telegraph before charge
        if (this.stateTime > 0.7) {
          this._startCharge();
        }
        break;

      case 'charge':
        this._chargeUpdate(dt);
        break;

      case 'stunned':
        if (this.stateTime > 3.0) {
          this._stunned = false;
          this._attackTimer = this._phase2 ? 1.5 : 2.5;
          this.setState('stalk', 'Walking_A');
        }
        break;
    }
  }

  // ── Attack selection ────────────────────────────────────────────────────────

  _pickAttack() {
    if (Math.random() < 0.5) {
      this._doGroundSlam();
    } else {
      this._doChargeTelegraph();
    }
  }

  _doGroundSlam() {
    this.game.events.emit('sfx', 'boss_slam');
    this.game.cameraRig.addShake(0.5);
    this._spawnShockwave();

    if (this._phase2) {
      // Spawn a second wave after 0.45s
      this._pendingSecondWave = true;
      this._secondWaveTimer = 0.45;
      this.setState('slam_wait', '2H_Melee_Attack_Chop', { once: true, duration: 0.8 });
    } else {
      this.setState('slam', '2H_Melee_Attack_Chop', { once: true, duration: 0.8 });
    }
  }

  _spawnShockwave() {
    const sw = new Shockwave(this.game, this.x, this.z);
    this.game.world.addEntity(sw);
  }

  _doChargeTelegraph() {
    this.game.events.emit('sfx', 'boss_roar');
    this.setState('taunt', 'Taunt', { once: true, duration: 0.7 });
  }

  _startCharge() {
    const p = this.player;
    const dx = p.x - this.x;
    const dz = p.z - this.z;
    const d = Math.hypot(dx, dz);
    this._chargeDirX = d > 0.01 ? dx / d : 0;
    this._chargeDirZ = d > 0.01 ? dz / d : 1;
    this._chargeHitPlayer = false;
    this.setState('charge', 'Running_A');
  }

  _chargeUpdate(dt) {
    const CHARGE_SPEED = 11;
    const col = this.game.world.collision;
    const p = this.player;

    // Check if player is in the path
    if (!this._chargeHitPlayer && p?.alive) {
      const dist = this.distanceTo(p);
      if (dist < this.radius + p.radius + 0.1) {
        const dx = p.x - this.x;
        const dz = p.z - this.z;
        const d = Math.hypot(dx, dz);
        const k = d > 0.01 ? 14 / d : 0;
        p.takeHit({ damage: 2, knockX: dx * k, knockZ: dz * k, source: this });
        this._chargeHitPlayer = true;
        // End the charge after hitting player
        this._wallStun();
        return;
      }
    }

    // Look ahead for wall collision
    const moveX = this._chargeDirX * CHARGE_SPEED * dt;
    const moveZ = this._chargeDirZ * CHARGE_SPEED * dt;
    const res = col.moveCircle(this.pos.x, this.pos.z, this.radius, moveX, moveZ);
    this.pos.x = res.x;
    this.pos.z = res.z;
    this.faceToward(this._chargeDirX, this._chargeDirZ, dt, 20);

    // Wall hit detection: if both axes blocked (or just the primary direction)
    if (res.hitX || res.hitZ) {
      this._wallStun();
    }

    // Safety timeout
    if (this.stateTime > 2.5) {
      this._wallStun();
    }
  }

  _wallStun() {
    this._stunned = true;
    this.game.events.emit('sfx', 'crumble');
    this.game.cameraRig.addShake(0.6);
    this.setState('stunned', 'Hit_A', {
      once: true,
      duration: 0.6,
      onDone: () => {
        if (this.state === 'stunned') {
          this.anim.play('2H_Melee_Idle');
        }
      },
    });
  }

  // ── Hit handling ─────────────────────────────────────────────────────────────

  takeHit(hit) {
    if (!this.alive) return false;

    const isExplosion = hit.kind === 'explosion';
    const isStunned = this._stunned;

    if (isExplosion) {
      // Strip armor and deal damage
      const accepted = super.takeHit(hit);
      if (accepted) {
        this.armored = false;
        this._armorTimer = 7.0;
        this.game.events.emit('sfx', 'crumble');
        this.game.cameraRig.addShake(0.4);
      }
      return accepted;
    }

    // While stunned from wall charge, accept sword/any hits even if armored
    if (isStunned) {
      return super.takeHit(hit);
    }

    // Unarmored window — normal damage
    if (!this.armored) {
      return super.takeHit(hit);
    }

    // Armored and not stunned — reject hit
    if (this._deniedTimer <= 0) {
      this.game.events.emit('sfx', 'denied');
      this._deniedTimer = 0.5;
    }
    return false;
  }
}
