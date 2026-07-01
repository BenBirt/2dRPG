import * as THREE from 'three';
import { Entity } from '../Entity.js';
import { ITEMS, TILE } from '../../data/balance.js';

const bombMaterial = new THREE.MeshStandardMaterial({ color: 0x23262e, roughness: 0.5 });
const fuseMaterial = new THREE.MeshStandardMaterial({
  color: 0xffa030, emissive: 0xff7020, emissiveIntensity: 2,
});

// Placed explosive: pulses while the fuse burns, then deals area damage to
// EVERYTHING (player included), destroys cracked walls, shakes the camera.
export class Bomb extends Entity {
  constructor(game, x, z) {
    super(game, x, z);
    this.fuse = ITEMS.bombs.fuse;
    this.mesh = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), bombMaterial);
    body.position.y = 0.3;
    const fuse = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), fuseMaterial);
    fuse.position.set(0.08, 0.66, 0);
    this.mesh.add(body, fuse);
    this.syncMesh();
  }

  update(dt) {
    super.update(dt);
    this.fuse -= dt;
    const t = Math.max(this.fuse, 0);
    const pulse = 1 + Math.sin((ITEMS.bombs.fuse - t) * (6 + (ITEMS.bombs.fuse - t) * 6)) * 0.08;
    this.mesh.scale.setScalar(pulse);
    if (this.fuse <= 0) this.explode();
  }

  explode() {
    if (this.removed) return;
    this.removed = true;
    const { radius, damage } = ITEMS.bombs;
    const world = this.game.world;

    for (const e of world.hittablesNear(this.x, this.z, radius, null)) {
      const dx = e.x - this.x;
      const dz = e.z - this.z;
      const d = Math.hypot(dx, dz);
      const k = d > 0.01 ? 14 / d : 0;
      e.takeHit({ damage, knockX: dx * k, knockZ: dz * k, source: this, kind: 'explosion' });
    }

    // notify cell-occupying structures (cracked walls) within blast range
    for (const e of world.entities) {
      if (e.removed || !e.onExplosion) continue;
      if (Math.hypot(e.x - this.x, e.z - this.z) <= radius + TILE * 0.4) e.onExplosion();
    }

    this.game.cameraRig.addShake(0.5);
    this.game.events.emit('sfx', 'explosion');
    this.game.spawnExplosionEffect?.(this.x, this.z, radius);
  }
}
