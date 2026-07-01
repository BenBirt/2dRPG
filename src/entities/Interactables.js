import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { Entity, AnimController } from './Entity.js';
import { Assets } from '../core/Assets.js';
import { TILE } from '../data/balance.js';

const DIRS = { n: Math.PI, s: 0, e: -Math.PI / 2, w: Math.PI / 2 };

function cellCenter(cx, cy) {
  return { x: (cx + 0.5) * TILE, z: (cy + 0.5) * TILE };
}

// ---------------------------------------------------------------- Chest
export class Chest extends Entity {
  constructor(game, def) {
    const { x, z } = cellCenter(def.x, def.y);
    super(game, x, z);
    this.def = def;
    this.radius = 0.7;
    this.opened = game.progress.flags.has(def.id);

    this.mesh = new THREE.Group();
    const model = Assets.get(def.big ? 'chest_gold' : 'chest').scene.clone();
    model.rotation.y = DIRS[def.dir ?? 's'];
    this.mesh.add(model);
    this.model = model;
    if (this.opened) model.scale.y = 0.7; // squashed = already looted
    this.syncMesh();

    game.world.collision.addBlocker(`chest:${def.id}`, def.x, def.y);
  }

  get promptText() {
    return this.opened ? null : 'Open';
  }

  interact(player) {
    if (this.opened) return;
    this.opened = true;
    this.model.scale.y = 0.7;
    this.game.setFlag(this.def.id);
    this.game.events.emit('sfx', 'chest');
    this.game.grantChestContents(this.def.contents, this);
  }
}

// ---------------------------------------------------------------- NPC
export class NPC extends Entity {
  constructor(game, def) {
    const { x, z } = cellCenter(def.x, def.y);
    super(game, x, z);
    this.def = def;
    this.radius = 0.45;
    this.facing = DIRS[def.dir ?? 's'];

    // Villagers reuse adventurer models (mage, rogue, barbarian, knight).
    const gltf = Assets.get(def.model ?? 'mage');
    const model = cloneSkinned(gltf.scene);
    model.scale.setScalar(def.scale ?? 0.55);
    this.mesh = new THREE.Group();
    this.mesh.add(model);
    this.anim = new AnimController(model, gltf.animations);
    this.anim.play(def.anim ?? 'Idle');
    this.syncMesh();
    game.world.collision.addBlocker(`npc:${def.id}`, def.x, def.y);
  }

  get promptText() {
    return 'Talk';
  }

  interact(player) {
    // face the player
    this.facing = Math.atan2(player.x - this.x, player.z - this.z);
    this.syncMesh();
    this.game.startDialog(this.def.dialogId);
  }
}

// ---------------------------------------------------------------- Sign / lectern
export class Sign extends Entity {
  constructor(game, def) {
    const { x, z } = cellCenter(def.x, def.y);
    super(game, x, z);
    this.def = def;
    this.radius = 0.4;

    this.mesh = new THREE.Group();
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 0.7, 6),
      new THREE.MeshStandardMaterial({ color: 0x77573a, roughness: 0.9 })
    );
    post.position.y = 0.35;
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.5, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x9a7448, roughness: 0.85 })
    );
    board.position.y = 0.85;
    this.mesh.add(post, board);
    this.facing = DIRS[def.dir ?? 's'];
    this.syncMesh();
  }

  get promptText() {
    return 'Read';
  }

  interact() {
    this.game.startDialog(this.def.dialogId);
  }
}

// ---------------------------------------------------------------- Eye switch
// A sealed eye set into the wall; only an arrow can strike it.
export class EyeSwitch extends Entity {
  constructor(game, def) {
    const { x, z } = cellCenter(def.x, def.y);
    super(game, x, z);
    this.def = def;
    this.radius = 0.5;
    this.hittable = true;
    this.friendly = null;
    this.triggered = game.progress.flags.has(def.sets);

    this.mesh = new THREE.Group();
    const frame = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.12, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0x5a5145, roughness: 0.7 })
    );
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 12, 10),
      new THREE.MeshStandardMaterial({
        color: 0xf2ead8, roughness: 0.35,
      })
    );
    const pupil = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 8, 8),
      new THREE.MeshStandardMaterial({
        color: 0x202738, emissive: 0x3050c0, emissiveIntensity: this.triggered ? 0 : 1.2,
      })
    );
    pupil.position.z = 0.24;
    this.eyeGroup = new THREE.Group();
    this.eyeGroup.add(frame, eye, pupil);
    this.eyeGroup.position.y = 1.5;
    this.mesh.add(this.eyeGroup);
    this.facing = DIRS[def.dir ?? 's'];
    if (this.triggered) this.eyeGroup.scale.z = 0.35; // closed lid look
    this.syncMesh();
  }

  update(dt) {
    super.update(dt);
    if (!this.triggered && this.game.player) {
      // the eye watches the player
      const p = this.game.player;
      this.eyeGroup.rotation.y = Math.atan2(p.x - this.x, p.z - this.z) - this.facing;
    }
  }

  takeHit(hit) {
    if (this.triggered || hit.kind !== 'arrow') return false;
    this.triggered = true;
    this.eyeGroup.scale.z = 0.35;
    this.game.events.emit('sfx', 'secret');
    this.game.setFlag(this.def.sets);
    return true;
  }
}

// ---------------------------------------------------------------- Cracked wall
// Sits on a WALKABLE grid cell, blocking it until a bomb blast clears it.
export class CrackedWall extends Entity {
  constructor(game, def) {
    const { x, z } = cellCenter(def.x, def.y);
    super(game, x, z);
    this.def = def;
    this.radius = 1.0;
    this.destroyed = game.progress.flags.has(def.id);

    this.mesh = new THREE.Group();
    if (!this.destroyed) {
      // full 4-unit length: the ends embed into the neighbouring solid cells
      const model = Assets.get('wall_cracked').scene.clone();
      model.scale.set(1, 0.55, 0.6);
      this.mesh.add(model);
      game.world.collision.addBlocker(`crack:${def.id}`, def.x, def.y);
    } else {
      const rubble = Assets.get('rubble_half').scene.clone();
      rubble.scale.setScalar(0.8);
      this.mesh.add(rubble);
    }
    this.facing = DIRS[def.dir ?? 's'];
    this.syncMesh();
  }

  onExplosion() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.game.world.collision.removeBlocker(`crack:${this.def.id}`);
    this.mesh.clear();
    const rubble = Assets.get('rubble_half').scene.clone();
    rubble.scale.setScalar(0.8);
    this.mesh.add(rubble);
    this.game.setFlag(this.def.id);
    this.game.events.emit('sfx', 'crumble');
  }
}

// ---------------------------------------------------------------- Warp
export class Warp extends Entity {
  constructor(game, def) {
    const { x, z } = cellCenter(def.x, def.y);
    super(game, x, z);
    this.def = def;
    this.radius = def.radius ?? 0.8;
    this.cooldown = 1; // grace period so we don't instantly re-trigger
  }

  update(dt) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    const p = this.game.player;
    if (this.cooldown > 0 || !p?.alive) return;
    if (Math.hypot(p.x - this.x, p.z - this.z) < this.radius + p.radius * 0.5) {
      this.game.warpTo(this.def.to.map, this.def.to.spawn);
    }
  }
}

// ---------------------------------------------------------------- Door
// Door types: 'shut' (opens via room_clear or flag), 'locked' (small key),
// 'boss' (boss key flag '<mapId>_bosskey'), 'oneway' (passable one way).
const doorMatByType = {
  shut: new THREE.MeshStandardMaterial({ color: 0x6e5436, roughness: 0.8 }),
  locked: new THREE.MeshStandardMaterial({ color: 0x7a6a4a, roughness: 0.6, metalness: 0.25 }),
  boss: new THREE.MeshStandardMaterial({ color: 0x55202c, roughness: 0.6 }),
  oneway: new THREE.MeshStandardMaterial({ color: 0x4a5460, roughness: 0.8 }),
};

export class Door extends Entity {
  constructor(game, def) {
    const { x, z } = cellCenter(def.x, def.y);
    super(game, x, z);
    this.def = def;
    this.radius = 1.0;
    this.cell = { c: def.x, r: def.y };
    this.blockerId = `door:${def.id}`;

    this.mesh = new THREE.Group();
    const frame = Assets.get('wall_doorway').scene.clone();
    frame.scale.set(0.5, 0.55, 0.6);
    this.mesh.add(frame);

    this.panel = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.7, 0.22), doorMatByType[def.type]);
    this.panel.position.y = 0.85;
    if (def.type === 'locked') {
      const lock = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xd8b430, metalness: 0.5, roughness: 0.35 })
      );
      lock.position.set(0, 0.7, 0.16);
      this.panel.add(lock);
    }
    if (def.type === 'boss') {
      const skull = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xe8e2cf, roughness: 0.5 })
      );
      skull.scale.set(1, 1.1, 0.7);
      skull.position.set(0, 0.95, 0.16);
      this.panel.add(skull);
    }
    this.mesh.add(this.panel);
    this.facing = DIRS[def.dir ?? 's'];
    this.syncMesh();

    this.open = this._initiallyOpen();
    if (this.open) this.panel.visible = false;
    else game.world.collision.addBlocker(this.blockerId, def.x, def.y);
  }

  _initiallyOpen() {
    const { def, game } = this;
    if (def.type === 'locked' || def.type === 'boss') return game.progress.flags.has(def.id);
    if (def.openWhen?.startsWith('flag:')) return game.progress.flags.has(def.openWhen.slice(5));
    if (def.openWhen === 'room_clear') return false; // RoomManager opens it
    return def.type === 'oneway';
  }

  setOpen(open, { sfx = true } = {}) {
    if (this.open === open) return;
    this.open = open;
    this.panel.visible = !open;
    if (open) this.game.world.collision.removeBlocker(this.blockerId);
    else this.game.world.collision.addBlocker(this.blockerId, this.def.x, this.def.y);
    if (sfx) this.game.events.emit('sfx', open ? 'door_open' : 'door_shut');
  }

  get promptText() {
    if (this.open) return null;
    if (this.def.type === 'locked') {
      const keys = this.game.progress.keys[this.game.world.mapDef.id] ?? 0;
      return keys > 0 ? 'Unlock' : 'Locked — needs a key';
    }
    if (this.def.type === 'boss') {
      return this.game.progress.flags.has(`${this.game.world.mapDef.id}_bosskey`)
        ? 'Unlock' : 'Sealed — needs the Boss Key';
    }
    return null;
  }

  interact() {
    if (this.open) return;
    const mapId = this.game.world.mapDef.id;
    const p = this.game.progress;
    if (this.def.type === 'locked') {
      if ((p.keys[mapId] ?? 0) > 0) {
        p.keys[mapId]--;
        this.setOpen(true);
        this.game.setFlag(this.def.id);
        this.game.events.emit('progress-changed');
      } else {
        this.game.events.emit('sfx', 'denied');
      }
    } else if (this.def.type === 'boss') {
      if (p.flags.has(`${mapId}_bosskey`)) {
        this.setOpen(true);
        this.game.setFlag(this.def.id);
      } else {
        this.game.events.emit('sfx', 'denied');
      }
    }
  }

  update(dt) {
    super.update(dt);
    // flag-gated doors listen for their flag
    if (!this.open && this.def.openWhen?.startsWith('flag:')
      && this.game.progress.flags.has(this.def.openWhen.slice(5))) {
      this.setOpen(true);
    }
    // one-way: passable only along def.dir; block when player approaches
    // from the forbidden side
    if (this.def.type === 'oneway') {
      const p = this.game.player;
      if (!p) return;
      const f = { x: Math.sin(DIRS[this.def.dir]), z: Math.cos(DIRS[this.def.dir]) };
      const dx = p.x - this.x;
      const dz = p.z - this.z;
      const onAllowedSide = (dx * f.x + dz * f.z) < 0;
      this.setOpen(onAllowedSide, { sfx: false });
    }
  }
}

export function createInteractable(game, def) {
  switch (def.type) {
    case 'chest': return new Chest(game, def);
    case 'npc': return new NPC(game, def);
    case 'sign':
    case 'lectern': return new Sign(game, def);
    case 'eye_switch':
    case 'switch': return new EyeSwitch(game, def);
    case 'cracked_wall': return new CrackedWall(game, def);
    case 'warp': return new Warp(game, def);
    default: return null;
  }
}
