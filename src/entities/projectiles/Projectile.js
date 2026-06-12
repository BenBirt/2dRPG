import * as THREE from 'three';
import { Entity } from '../Entity.js';

// Base projectile: straight (or homing) flight, grid raycast per step so fast
// shots can't tunnel walls, circle test against opposing hittables.
export class Projectile extends Entity {
  constructor(game, x, z, dirX, dirZ, { speed, damage, friendly, life = 3, homing = 0, kind = 'bolt' }) {
    super(game, x, z);
    this.pos.y = 0.7;
    this.radius = 0.18;
    this.speed = speed;
    this.damage = damage;
    this.friendly = friendly;
    this.life = life;
    this.homing = homing;
    this.kind = kind;
    const d = Math.hypot(dirX, dirZ) || 1;
    this.dirX = dirX / d;
    this.dirZ = dirZ / d;
    this.facing = Math.atan2(this.dirX, this.dirZ);
  }

  update(dt) {
    super.update(dt);
    this.life -= dt;
    if (this.life <= 0) {
      this.removed = true;
      return;
    }

    if (this.homing > 0 && this.friendly === false && this.game.player?.alive) {
      const p = this.game.player;
      const want = Math.atan2(p.x - this.x, p.z - this.z);
      let cur = Math.atan2(this.dirX, this.dirZ);
      let diff = want - cur;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      cur += THREE.MathUtils.clamp(diff, -this.homing * dt, this.homing * dt);
      this.dirX = Math.sin(cur);
      this.dirZ = Math.cos(cur);
    }

    const step = this.speed * dt;
    const wallDist = this.game.world.collision.raycast(this.x, this.z, this.dirX, this.dirZ, step + this.radius);
    if (wallDist !== null) {
      this.pos.x += this.dirX * Math.max(0, wallDist - this.radius);
      this.pos.z += this.dirZ * Math.max(0, wallDist - this.radius);
      this.onWallHit();
      this.removed = true;
      return;
    }
    this.pos.x += this.dirX * step;
    this.pos.z += this.dirZ * step;
    this.facing = Math.atan2(this.dirX, this.dirZ);

    for (const e of this.game.world.hittablesNear(this.x, this.z, this.radius + 0.35, this)) {
      if (e.friendly !== null && e.friendly === this.friendly) continue;
      if (!this.canHit(e)) continue;
      const dx = e.x - this.x;
      const dz = e.z - this.z;
      const d = Math.hypot(dx, dz);
      const k = d > 0.01 ? 6 / d : 0;
      const accepted = e.takeHit({
        damage: this.damage, knockX: dx * k, knockZ: dz * k,
        source: this.owner ?? this, kind: this.kind,
      });
      if (accepted !== false) {
        this.removed = true;
        return;
      }
    }

    this.syncMesh();
  }

  canHit() {
    return true;
  }

  onWallHit() {}
}
