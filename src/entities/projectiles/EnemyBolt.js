import * as THREE from 'three';
import { Projectile } from './Projectile.js';

const boltMaterial = new THREE.MeshStandardMaterial({
  color: 0xb02838, emissive: 0xe03048, emissiveIntensity: 1.6, roughness: 0.4,
});
const magicMaterial = new THREE.MeshStandardMaterial({
  color: 0x7038c0, emissive: 0x9050ff, emissiveIntensity: 1.8, roughness: 0.4,
});

export class EnemyBolt extends Projectile {
  constructor(game, owner, x, z, dirX, dirZ, { speed, damage, homing = 0 }) {
    super(game, x, z, dirX, dirZ, {
      speed, damage, friendly: false, life: 4, homing, kind: 'bolt',
    });
    this.owner = owner;
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 8, 6),
      homing > 0 ? magicMaterial : boltMaterial
    );
    this.mesh.position.copy(this.pos);
    this.spin = 0;
    this.syncMesh();
  }

  update(dt) {
    super.update(dt);
    if (this.mesh && !this.removed) {
      this.spin += dt * 6;
      this.mesh.scale.setScalar(1 + Math.sin(this.spin) * 0.15);
    }
  }
}
