import * as THREE from 'three';
import { buildMap } from './MapLoader.js';
import { TILE, DROPS } from '../data/balance.js';

// fixed pool → constant shader light count; smaller on phones where per-
// fragment light cost bites hardest
const TORCH_LIGHTS = window.matchMedia?.('(pointer: coarse)').matches ? 4 : 7;
import { createInteractable, Door } from '../entities/Interactables.js';
import { createEnemy } from '../entities/enemies/Skeletons.js';
import { createBoss } from '../entities/bosses/Bosses.js';
import { Pickup } from '../entities/Pickup.js';

// Owns the currently loaded map: static scene content, collision grid, and
// the live entity list. Combat-area queries used by players/enemies live
// here too, so entities never need to know about each other directly.
export class World {
  constructor(game) {
    this.game = game;
    this.mapDef = null;
    this.group = null;
    this.collision = null;
    this.entities = [];
    this.cuttables = [];
    this.waterMesh = null;
    this.time = 0;
    this.activeRoomId = null;
  }

  load(mapDef) {
    this.unload();
    this.mapDef = mapDef;
    const built = buildMap(mapDef);
    this.group = built.group;
    this.collision = built.collision;
    this.heightfield = built.heightfield;
    this.cuttables = built.cuttables;
    this.waterMesh = built.waterMesh;
    this.waterfalls = built.waterfalls || [];
    this.torches = built.torches || [];
    this.cols = built.cols;
    this.rows = built.rows;
    this.game.scene.add(this.group);
    this._initTorchLights();
  }

  // A fixed pool of point lights that snap to the nearest torches to the player
  // each frame and flicker — dungeon atmosphere at a constant shader cost.
  _initTorchLights() {
    if (!this._torchPool) {
      this._torchPool = [];
      for (let i = 0; i < TORCH_LIGHTS; i++) {
        // always present & visible with a constant count (intensity 0 when
        // unused) so the light count never changes and shaders never recompile
        const l = new THREE.PointLight(0xffa542, 0, 8, 2);
        this.game.scene.add(l);
        this._torchPool.push(l);
      }
    }
    for (const l of this._torchPool) l.intensity = 0;
  }

  _updateTorchLights() {
    const pool = this._torchPool;
    if (!pool) return;
    if (!this.torches.length || !this.game.player) {
      for (const l of pool) l.intensity = 0;
      return;
    }
    const p = this.game.player.pos;
    const near = this.torches
      .map((t) => ({ t, d: (t.x - p.x) ** 2 + (t.z - p.z) ** 2 }))
      .sort((a, b) => a.d - b.d)
      .slice(0, TORCH_LIGHTS);
    for (let i = 0; i < pool.length; i++) {
      const l = pool[i];
      if (i < near.length && near[i].d < 420) {
        const { t } = near[i];
        l.position.set(t.x, t.y, t.z);
        const flicker = 1 + Math.sin(this.time * 11 + t.x * 3.1) * 0.14
          + Math.sin(this.time * 23 + t.z * 1.7) * 0.08;
        l.intensity = 9 * flicker;
      } else {
        l.intensity = 0;
      }
    }
  }

  // Ground elevation at a world position (0 for flat maps).
  terrainHeightAt(x, z) {
    return this.heightfield ? this.heightfield.heightAt(x, z) : 0;
  }

  unload() {
    if (this.group) {
      this.game.scene.remove(this.group);
      this.group.traverse((n) => {
        if (n.isMesh || n.isInstancedMesh) n.geometry.dispose();
      });
    }
    for (const e of this.entities) this.removeEntityMesh(e);
    this.entities = [];
    this.group = null;
    this.collision = null;
    this.cuttables = [];
    this.waterMesh = null;
    this.activeRoomId = null;
  }

  addEntity(entity) {
    this.entities.push(entity);
    // seat the entity on the terrain (players/enemies re-sample every frame;
    // static entities keep this spawn height)
    if (entity.groundY === undefined) {
      entity.groundY = this.terrainHeightAt(entity.pos.x, entity.pos.z);
      if (entity.pos.y === 0) entity.pos.y = entity.groundY;
    }
    if (entity.mesh) {
      // props/chests/doors/npcs cast shadows (characters set their own flags
      // in their constructors; re-applying is harmless)
      if (!entity.noShadow) {
        entity.mesh.traverse((n) => {
          if (n.isMesh || n.isSkinnedMesh) n.castShadow = true;
        });
      }
      entity.syncMesh?.();
      this.game.scene.add(entity.mesh);
    }
    return entity;
  }

  removeEntityMesh(entity) {
    if (entity.mesh) this.game.scene.remove(entity.mesh);
    entity.dispose();
  }

  // Instantiates everything declared in the map definition. Called by
  // Game.enterMap after the player has been re-added.
  spawnMapEntities() {
    const flags = this.game.progress.flags;
    for (const def of this.mapDef.entities || []) {
      switch (def.type) {
        case 'player_spawn':
          break;
        case 'skeleton':
        case 'skeleton_archer':
        case 'skeleton_mage': {
          const e = createEnemy(this.game, def.type, (def.x + 0.5) * TILE, (def.y + 0.5) * TILE);
          e.roomId = def.room ?? null;
          this.addEntity(e);
          break;
        }
        case 'boss1':
        case 'boss2':
        case 'boss3': {
          if (flags.has(`${this.mapDef.id}_boss_dead`)) break;
          const b = createBoss(this.game, def.type, (def.x + 0.5) * TILE, (def.y + 0.5) * TILE);
          b.roomId = def.room ?? null;
          this.addEntity(b);
          break;
        }
        case 'pickup': {
          if (def.id && flags.has(def.id)) break;
          this.addEntity(new Pickup(this.game, (def.x + 0.5) * TILE, (def.y + 0.5) * TILE,
            def.kind, { persist: def.id ?? null }));
          break;
        }
        default: {
          const e = createInteractable(this.game, def);
          if (e) this.addEntity(e);
          break;
        }
      }
    }
    for (const def of this.mapDef.doors || []) {
      this.addEntity(new Door(this.game, def));
    }
  }

  spawnPoint(spawnId) {
    const def = (this.mapDef.entities || []).find(
      (e) => e.type === 'player_spawn' && (!spawnId || e.id === spawnId)
    );
    if (!def) throw new Error(`Map ${this.mapDef.id}: no player_spawn '${spawnId}'`);
    return { x: (def.x + 0.5) * TILE, z: (def.y + 0.5) * TILE, dir: def.dir };
  }

  update(dt) {
    this.time += dt;
    if (this.waterMesh) {
      this.waterMesh.position.y = Math.sin(this.time * 1.4) * 0.035;
    }
    // scroll waterfall UVs downward for a flowing look
    for (const wf of this.waterfalls) {
      if (wf.material.map) wf.material.map.offset.y = (this.time * 0.9) % 1;
      wf.material.emissiveIntensity = 0.28 + Math.sin(this.time * 6) * 0.06;
    }
    this._updateTorchLights();

    for (const e of this.entities) {
      if (e.removed) continue;
      // dungeon rooms: only entities in the active room (or roomless) think
      if (e.roomId && this.activeRoomId && e.roomId !== this.activeRoomId) continue;
      e.update(dt);
    }

    // compact removed entities occasionally
    if (this.entities.some((e) => e.removed)) {
      for (const e of this.entities) {
        if (e.removed) this.removeEntityMesh(e);
      }
      this.entities = this.entities.filter((e) => !e.removed);
    }
  }

  // --- combat / interaction queries -------------------------------------

  hittablesNear(x, z, radius, exclude = null) {
    const out = [];
    for (const e of this.entities) {
      if (e.removed || !e.alive || !e.hittable || e === exclude) continue;
      if (e.roomId && this.activeRoomId && e.roomId !== this.activeRoomId) continue;
      const d = Math.hypot(e.x - x, e.z - z);
      if (d <= radius + e.radius) out.push(e);
    }
    return out;
  }

  // Frontal-sector melee sweep. hitSet prevents multi-hits within one swing.
  sweepSector(attacker, facing, range, halfArc, { damage, knockback, hitSet, source }) {
    for (const e of this.hittablesNear(attacker.x, attacker.z, range, attacker)) {
      if (hitSet?.has(e.id)) continue;
      if (e === source) continue;
      // friendly: true = player side, false = enemy side, null = hit by anyone
      if (e.friendly !== null && e.friendly === source.friendly) continue;
      const dx = e.x - attacker.x;
      const dz = e.z - attacker.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.01) {
        const dot = (dx * facing.x + dz * facing.z) / dist;
        if (dot < Math.cos(halfArc)) continue;
      }
      hitSet?.add(e.id);
      const k = dist > 0.01 ? knockback / dist : 0;
      e.takeHit({ damage, knockX: dx * k, knockZ: dz * k, source });
    }

    // cuttable grass/pots in the sector
    this._cutInSector(attacker, facing, range, halfArc);
  }

  _cutInSector(attacker, facing, range, halfArc) {
    const t = TILE;
    const c0 = Math.floor((attacker.x - range) / t);
    const c1 = Math.floor((attacker.x + range) / t);
    const r0 = Math.floor((attacker.z - range) / t);
    const r1 = Math.floor((attacker.z + range) / t);
    for (const field of this.cuttables) {
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          if (!field.has(c, r)) continue;
          const cx = (c + 0.5) * t;
          const cz = (r + 0.5) * t;
          const dx = cx - attacker.x;
          const dz = cz - attacker.z;
          const dist = Math.hypot(dx, dz);
          if (dist > range + 0.6) continue;
          if (dist > 0.01 && (dx * facing.x + dz * facing.z) / dist < Math.cos(halfArc + 0.25)) continue;
          field.removeAt(c, r);
          this.game.events.emit('sfx', 'cut');
          this.spawnDrop(cx, cz, DROPS[field.kind]);
        }
      }
    }
  }

  spawnDrop(x, z, table) {
    if (!table) return;
    let t = Math.random();
    let acc = 0;
    let kind = null;
    for (const [w, v] of table) {
      acc += w;
      if (t <= acc) { kind = v; break; }
    }
    if (!kind) return;
    this.game.spawnPickup?.(x, z, kind);
  }

  interactableNear(player) {
    const f = player.facingVec();
    let best = null;
    let bestDist = Infinity;
    for (const e of this.entities) {
      if (e.removed || !e.interact) continue;
      if (e.roomId && this.activeRoomId && e.roomId !== this.activeRoomId) continue;
      const dx = e.x - player.x;
      const dz = e.z - player.z;
      const dist = Math.hypot(dx, dz);
      const reach = 1.4 + e.radius;
      if (dist > reach) continue;
      if (dist > 0.3 && (dx * f.x + dz * f.z) / dist < 0.25) continue;
      if (dist < bestDist) { best = e; bestDist = dist; }
    }
    return best;
  }

  // Filled in by later milestones (projectiles, bombs).
  shootArrow(player) { this.game.shootArrow?.(player); }
  placeBomb(player) { this.game.placeBomb?.(player); }
}
