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
    this.pupil = pupil;
    this.eyeGroup = new THREE.Group();
    this.eyeGroup.add(frame, eye, pupil);
    this.eyeGroup.position.y = 1.5;
    this.mesh.add(this.eyeGroup);

    // an untriggered eye glows and casts a small coloured light so it reads
    // clearly as a special, shootable target
    if (!this.triggered) {
      this.glow = new THREE.PointLight(0x5a7cff, 6, 6, 2);
      this.glow.position.set(0, 1.5, 0.3);
      this.mesh.add(this.glow);
    }
    this.facing = DIRS[def.dir ?? 's'];
    if (this.triggered) this.eyeGroup.scale.z = 0.35; // closed lid look
    this.syncMesh();
  }

  update(dt) {
    super.update(dt);
    if (!this.triggered && this.game.player) {
      // the eye watches the player and pulses to draw attention
      const p = this.game.player;
      this.eyeGroup.rotation.y = Math.atan2(p.x - this.x, p.z - this.z) - this.facing;
      const t = this.game.world.time;
      const pulse = 1 + Math.sin(t * 4) * 0.5;
      this.pupil.material.emissiveIntensity = 1.2 * pulse;
      if (this.glow) this.glow.intensity = 5 * pulse;
    }
  }

  takeHit(hit) {
    if (this.triggered || hit.kind !== 'arrow') return false;
    this.triggered = true;
    this.eyeGroup.scale.z = 0.35;
    this.pupil.material.emissiveIntensity = 0;
    if (this.glow) { this.mesh.remove(this.glow); this.glow = null; }
    this.game.events.emit('sfx', 'secret');
    this.game.setFlag(this.def.sets);
    return true;
  }
}

// ---------------------------------------------------------------- Floor switch
// A pressure plate set into the floor: stepping on it depresses it with a
// clunk and sets its flag (opening whichever door listens for it).
export class FloorSwitch extends Entity {
  constructor(game, def) {
    const { x, z } = cellCenter(def.x, def.y);
    super(game, x, z);
    this.def = def;
    this.radius = 0.55;
    this.noShadow = true;
    this.triggered = game.progress.flags.has(def.sets);

    this.mesh = new THREE.Group();
    const rim = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.1, 1.5),
      new THREE.MeshStandardMaterial({ color: 0x55504a, roughness: 0.85 })
    );
    rim.position.y = 0.05;
    this.plate = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.14, 1.1),
      new THREE.MeshStandardMaterial({
        color: 0xb99a4e, metalness: 0.35, roughness: 0.45,
        emissive: 0x604a18, emissiveIntensity: this.triggered ? 0 : 0.5,
      })
    );
    this.plate.position.y = this.triggered ? 0.05 : 0.13;
    this.mesh.add(rim, this.plate);
    this.syncMesh();
  }

  // Anything heavy on the plate: the player, or a push block.
  _pressed() {
    const p = this.game.player;
    if (p?.alive && Math.hypot(p.x - this.x, p.z - this.z) < this.radius + p.radius * 0.4) {
      return true;
    }
    for (const e of this.game.world.entities) {
      if (e.isBlock && !e.removed
        && Math.hypot(e.x - this.x, e.z - this.z) < this.radius + 0.4) return true;
    }
    return false;
  }

  update(dt) {
    super.update(dt);
    const timed = this.def.timed; // seconds the flag stays up, or undefined
    if (this.triggered && !timed) return;

    if (!this.triggered) {
      // gentle pulse so it reads as interactive
      this.plate.material.emissiveIntensity = 0.4 + Math.sin(this.game.world.time * 3.2) * 0.25;
      if (this._pressed()) {
        this.triggered = true;
        this.plate.position.y = 0.05;
        this.plate.material.emissiveIntensity = 0;
        this.game.cameraRig.addShake(0.12);
        this.game.events.emit('sfx', 'secret');
        if (timed) {
          this.game.setTransientFlag(this.def.sets, timed);
          this._resetAt = this.game.world.time + timed;
        } else {
          this.game.setFlag(this.def.sets);
        }
      }
    } else if (timed && this.game.world.time >= this._resetAt) {
      // timed plate pops back up, ready to be pressed again
      this.triggered = false;
      this.plate.position.y = 0.13;
      this.game.events.emit('sfx', 'cycle');
    }
  }
}

// ---------------------------------------------------------------- Push block
// A heavy stone block the player shoves one cell at a time by walking into it
// — the classic Zelda puzzle piece. Blocks reset on map reload; the plates
// they land on latch flags, so solved puzzles stay solved.
export class PushBlock extends Entity {
  constructor(game, def) {
    const { x, z } = cellCenter(def.x, def.y);
    super(game, x, z);
    this.def = def;
    this.isBlock = true;
    this.radius = 0.85;
    this.cell = { c: def.x, r: def.y };
    this.blockerId = `block:${def.id}`;
    game.world.collision.addBlocker(this.blockerId, def.x, def.y);

    const geo = new THREE.BoxGeometry(1.7, 1.5, 1.7);
    const mat = new THREE.MeshStandardMaterial({ color: 0x8d8578, roughness: 0.9 });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.y = 0.75;
    this.slide = null; // { fx, fz, tx, tz, t }
    this._pushTime = 0;
    this.syncMesh();
  }

  syncMesh() {
    if (!this.mesh) return;
    this.mesh.position.set(this.pos.x, this.pos.y + 0.75, this.pos.z);
  }

  update(dt) {
    if (this.slide) {
      this.slide.t = Math.min(1, this.slide.t + dt / 0.4);
      const k = this.slide.t;
      const ease = k * k * (3 - 2 * k);
      this.pos.x = this.slide.fx + (this.slide.tx - this.slide.fx) * ease;
      this.pos.z = this.slide.fz + (this.slide.tz - this.slide.fz) * ease;
      if (this.slide.t >= 1) {
        this.slide = null;
        this.game.events.emit('sfx', 'door_shut'); // stone thunk
        this.game.cameraRig.addShake(0.06);
      }
      this.pos.y = this.game.world.terrainHeightAt(this.pos.x, this.pos.z);
      this.syncMesh();
      return;
    }

    const p = this.game.player;
    if (!p?.alive) return;
    const dx = this.x - p.x;
    const dz = this.z - p.z;
    const dist = Math.hypot(dx, dz);
    // the collision blocker holds the player at exactly TILE/2 + their radius
    // from the block centre, so the contact threshold needs headroom past that
    const touching = dist < TILE / 2 + p.radius + 0.2;
    // pushing = touching AND moving into the block
    const mv = this.game.input;
    const moving = Math.hypot(mv.moveX, mv.moveY) > 0.3;
    const toward = moving && dist > 0.01
      && (mv.moveX * dx + mv.moveY * dz) / dist > 0.6;
    if (touching && toward) {
      this._pushTime += dt;
      if (this._pushTime > 0.25) {
        this._pushTime = 0;
        this._tryPush(Math.abs(dx) > Math.abs(dz)
          ? { dc: Math.sign(dx), dr: 0 }
          : { dc: 0, dr: Math.sign(dz) });
      }
    } else {
      this._pushTime = 0;
    }
  }

  _tryPush({ dc, dr }) {
    const col = this.game.world.collision;
    const nc = this.cell.c + dc;
    const nr = this.cell.r + dr;
    // target must be open floor with no other blocker/entity in it
    if (col.isSolidCell(nc, nr)) {
      this.game.events.emit('sfx', 'denied');
      return;
    }
    const cx = (nc + 0.5) * TILE;
    const cz = (nr + 0.5) * TILE;
    for (const e of this.game.world.entities) {
      if (e === this || e.removed) continue;
      if ((e.hittable || e.isBlock || e.interact) && Math.hypot(e.x - cx, e.z - cz) < 0.9) return;
    }
    col.removeBlocker(this.blockerId);
    col.addBlocker(this.blockerId, nc, nr);
    this.slide = { fx: this.pos.x, fz: this.pos.z, tx: cx, tz: cz, t: 0 };
    this.cell = { c: nc, r: nr };
    this.game.events.emit('sfx', 'boss_swing'); // low grinding whoosh
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
    this.noShadow = true;

    // exits are visible: a glowing floor ring + soft light shaft. A warp with
    // def.requires stays dormant (invisible, inert) until that flag is set —
    // used for the post-boss return portal.
    this.mesh = new THREE.Group();
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x9fd8ff, transparent: true, opacity: 0.85, depthWrite: false,
    });
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.09, 8, 24), ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.06;
    const shaftMat = new THREE.MeshBasicMaterial({
      color: 0xbfe6ff, transparent: true, opacity: 0.16, depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.75, 3.2, 12, 1, true), shaftMat);
    this.shaft.position.y = 1.6;
    this.mesh.add(this.ring, this.shaft);
    this.syncMesh();
    this._syncActive();
  }

  get active() {
    return !this.def.requires || this.game.progress.flags.has(this.def.requires);
  }

  _syncActive() {
    this.mesh.visible = this.active;
  }

  update(dt) {
    this._syncActive();
    if (!this.active) return;
    const t = this.game.world.time;
    this.ring.material.opacity = 0.6 + Math.sin(t * 3) * 0.25;
    this.ring.rotation.z = t * 0.8;
    this.shaft.material.opacity = 0.12 + Math.sin(t * 2.2) * 0.05;

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

  // openWhen supports 'room_clear', 'flag:x', and 'flags:a+b' (all required).
  _flagConditionMet() {
    const { def, game } = this;
    if (def.openWhen?.startsWith('flag:')) return game.hasFlag(def.openWhen.slice(5));
    if (def.openWhen?.startsWith('flags:')) {
      return def.openWhen.slice(6).split('+').every((f) => game.hasFlag(f));
    }
    return null; // not flag-driven
  }

  _initiallyOpen() {
    const { def, game } = this;
    if (def.type === 'locked' || def.type === 'boss') return game.progress.flags.has(def.id);
    const flagCond = this._flagConditionMet();
    if (flagCond !== null) return flagCond;
    if (def.openWhen === 'room_clear') return false; // RoomManager opens it
    return def.type === 'oneway';
  }

  setOpen(open, { sfx = true } = {}) {
    if (this.open === open) return;
    this.open = open;
    if (open) {
      // panel slides down in update(); starting fresh each open
      this._slide = 1;
    } else {
      this._slide = null;
      this.panel.visible = true;
      this.panel.position.y = 0.85;
    }
    if (open) this.game.world.collision.removeBlocker(this.blockerId);
    else this.game.world.collision.addBlocker(this.blockerId, this.def.x, this.def.y);
    if (sfx) {
      this.game.events.emit('sfx', open ? 'door_open' : 'door_shut');
      // opened by something remote (a switch, a flag): tell the player it
      // happened even though the door is off-screen
      const p = this.game.player;
      if (open && p && Math.hypot(p.x - this.x, p.z - this.z) > 9) {
        this.game.events.emit('toast', 'You hear a door grind open somewhere…');
      }
    }
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
    // animate the panel sliding into the floor after setOpen(true); the state
    // is self-correcting — an open door's panel ALWAYS converges to hidden and
    // a closed door's panel to raised, no matter which code path flipped it
    if (this.open && this.panel.visible) {
      this._slide = (this._slide ?? 1) - dt / 0.7;
      if (this._slide <= 0) {
        this.panel.visible = false;
        this._slide = null;
      } else {
        this.panel.position.y = 0.85 - (1 - this._slide) * 2.1;
      }
    } else if (!this.open && !this.panel.visible) {
      this.panel.visible = true;
      this.panel.position.y = 0.85;
      this._slide = null;
    } else if (!this.open && this.panel.position.y !== 0.85) {
      this.panel.position.y = 0.85;
      this._slide = null;
    }
    // flag-gated doors follow their condition; volatile doors also RE-CLOSE
    // when the condition lapses (timed plates)
    const cond = this._flagConditionMet();
    if (cond !== null) {
      if (!this.open && cond) this.setOpen(true);
      else if (this.open && !cond && this.def.volatile) this.setOpen(false);
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
    case 'floor_switch': return new FloorSwitch(game, def);
    case 'push_block': return new PushBlock(game, def);
    case 'cracked_wall': return new CrackedWall(game, def);
    case 'warp': return new Warp(game, def);
    default: return null;
  }
}
