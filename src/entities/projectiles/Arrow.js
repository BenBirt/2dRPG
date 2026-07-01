import * as THREE from 'three';
import { Projectile } from './Projectile.js';
import { ITEMS } from '../../data/balance.js';

const shaftMaterial = new THREE.MeshStandardMaterial({ color: 0x9a7448, roughness: 0.8 });
const headMaterial = new THREE.MeshStandardMaterial({ color: 0xb9c2cc, roughness: 0.4, metalness: 0.4 });

function makeArrowMesh() {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.7, 5), shaftMaterial);
  shaft.rotation.x = Math.PI / 2;
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.18, 5), headMaterial);
  head.rotation.x = Math.PI / 2;
  head.position.z = 0.42;
  g.add(shaft, head);
  return g;
}

export class Arrow extends Projectile {
  constructor(game, owner, x, z, dirX, dirZ) {
    super(game, x, z, dirX, dirZ, {
      speed: ITEMS.bow.arrowSpeed,
      damage: ITEMS.bow.arrowDamage,
      friendly: true,
      life: 1.6,
      kind: 'arrow',
    });
    this.owner = owner;
    this.mesh = makeArrowMesh();
    this.mesh.position.copy(this.pos);
    this.syncMesh();
  }

  onWallHit() {
    this.game.events.emit('sfx', 'arrow_hit');
  }
}
