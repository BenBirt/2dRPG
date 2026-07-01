import * as THREE from 'three';
import { Entity } from './Entity.js';
import { Assets } from '../core/Assets.js';
import { PICKUPS } from '../data/balance.js';

const heartMat = new THREE.MeshStandardMaterial({
  color: 0xe23b4a, emissive: 0x701020, roughness: 0.4,
});
const bombMat = new THREE.MeshStandardMaterial({ color: 0x23262e, roughness: 0.5 });
const arrowMat = new THREE.MeshStandardMaterial({ color: 0x9a7448, roughness: 0.8 });

function makeMesh(kind) {
  switch (kind) {
    case 'heart': {
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.24), heartMat);
      m.scale.y = 1.25;
      m.position.y = 0.45;
      return wrap(m);
    }
    case 'rupee':
    case 'rupee5': {
      const src = Assets.get('coin').scene.clone();
      src.scale.setScalar(kind === 'rupee5' ? 2.6 : 1.8);
      src.position.y = 0.35;
      return wrap(src);
    }
    case 'arrows5': {
      const g = new THREE.Group();
      for (let i = -1; i <= 1; i++) {
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 4), arrowMat);
        shaft.position.set(i * 0.09, 0.4, 0);
        shaft.rotation.z = i * 0.12;
        g.add(shaft);
      }
      return wrap(g);
    }
    case 'bomb1': {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 6), bombMat);
      m.position.y = 0.35;
      return wrap(m);
    }
    case 'heart_container': {
      const g = new THREE.Group();
      const heart = new THREE.Mesh(new THREE.OctahedronGeometry(0.42), heartMat);
      heart.scale.y = 1.25;
      heart.position.y = 0.75;
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.55, 0.06, 8, 18),
        new THREE.MeshStandardMaterial({ color: 0xd8b430, metalness: 0.5, roughness: 0.3 })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.75;
      g.add(heart, ring);
      return wrap(g);
    }
    case 'small_key': {
      const src = Assets.get('key').scene.clone();
      src.scale.setScalar(1.4);
      src.position.y = 0.5;
      src.rotation.x = -0.5;
      return wrap(src);
    }
    default:
      return wrap(new THREE.Mesh(new THREE.SphereGeometry(0.2), heartMat));
  }
}

function wrap(inner) {
  const g = new THREE.Group();
  g.add(inner);
  return g;
}

export class Pickup extends Entity {
  constructor(game, x, z, kind, { persist = null } = {}) {
    super(game, x, z);
    this.kind = kind;
    this.persistFlag = persist; // map-placed pickups stay collected via flag
    this.radius = 0.45;
    this.age = 0;
    this.ttl = persist ? Infinity : 11;
    this.mesh = makeMesh(kind);
    this.baseY = 0;
    this.syncMesh();
  }

  update(dt) {
    super.update(dt);
    this.age += dt;
    if (this.age > this.ttl) {
      this.removed = true;
      return;
    }
    // bob + spin, blink near despawn
    this.mesh.position.y = Math.sin(this.age * 3) * 0.08;
    this.mesh.rotation.y += dt * 2.2;
    if (this.ttl - this.age < 3) {
      this.mesh.visible = Math.floor(this.age * 10) % 2 === 0;
    }

    const p = this.game.player;
    if (p?.alive && Math.hypot(p.x - this.x, p.z - this.z) < this.radius + p.radius) {
      this.collect(p);
    }
  }

  collect(player) {
    if (this.kind === 'heart_container') {
      this.removed = true;
      this.game.collectHeartContainer(this.persistFlag);
      return;
    }
    const fx = PICKUPS[this.kind];
    const prog = this.game.progress;
    if (fx?.heal) {
      if (prog.hearts >= prog.maxHearts * 2 && this.persistFlag === null) return; // leave it
      player.heal(fx.heal);
    }
    if (fx?.rupees) prog.rupees += fx.rupees;
    if (fx?.arrows) prog.arrows = Math.min(prog.arrows + fx.arrows, 30);
    if (fx?.bombs) prog.bombs = Math.min(prog.bombs + fx.bombs, 8);
    if (this.kind === 'small_key') {
      const mapId = this.game.world.mapDef.id;
      prog.keys[mapId] = (prog.keys[mapId] ?? 0) + 1;
    }
    if (this.persistFlag) this.game.setFlag(this.persistFlag);
    this.removed = true;
    this.game.events.emit('sfx', this.kind === 'rupee' || this.kind === 'rupee5' ? 'rupee' : 'pickup');
    this.game.events.emit('progress-changed');
  }
}
