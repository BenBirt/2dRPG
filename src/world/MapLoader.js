import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Assets } from '../core/Assets.js';
import { CollisionGrid } from './Collision.js';
import { LEGEND, FLOOR_VARIANTS } from '../data/tiles.js';
import { TILE } from '../data/balance.js';
import {
  makeTreeGeometry, makeRockGeometry, makeGrassTuftGeometry,
  makeCliffGeometry, makeGroundCellGeometry, GROUND_COLORS,
} from './Procedural.js';

const WALL_H = 2.2;
const WALL_SCALE_Y = WALL_H / 4; // KayKit walls are 4 units tall

// Deterministic per-cell hash so floor variants and prop rotations are stable.
function cellHash(c, r) {
  let h = (c * 73856093) ^ (r * 19349663);
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

function pickWeighted(pool, t) {
  let acc = 0;
  for (const [w, v] of pool) {
    acc += w;
    if (t <= acc) return v;
  }
  return pool[pool.length - 1][1];
}

// Extracts world-transformed, attribute-normalized geometries from a cached
// model, grouped under their material. Results are cached per model name.
const modelGeoCache = new Map();
function modelGeometries(name) {
  if (modelGeoCache.has(name)) return modelGeoCache.get(name);
  const scene = Assets.get(name).scene;
  scene.updateMatrixWorld(true);
  const out = [];
  scene.traverse((node) => {
    if (!node.isMesh) return;
    let geo = node.geometry.index ? node.geometry.toNonIndexed() : node.geometry.clone();
    for (const attr of Object.keys(geo.attributes)) {
      if (attr !== 'position' && attr !== 'normal' && attr !== 'uv') geo.deleteAttribute(attr);
    }
    geo.applyMatrix4(node.matrixWorld);
    out.push({ geometry: geo, material: node.material });
  });
  modelGeoCache.set(name, out);
  return out;
}

// Accumulates transformed copies of geometries, bucketed by material, then
// merges each bucket into a single mesh: a whole map in a handful of draws.
class StaticBatcher {
  constructor() {
    this.buckets = new Map(); // key -> { material, geos: [] }
  }

  addModel(name, matrix) {
    for (const { geometry, material } of modelGeometries(name)) {
      const key = material.uuid;
      if (!this.buckets.has(key)) this.buckets.set(key, { material, geos: [] });
      this.buckets.get(key).geos.push(geometry.clone().applyMatrix4(matrix));
    }
  }

  addProcedural(key, material, geometry, matrix = null) {
    if (!this.buckets.has(key)) this.buckets.set(key, { material, geos: [] });
    this.buckets.get(key).geos.push(matrix ? geometry.applyMatrix4(matrix) : geometry);
  }

  build() {
    const group = new THREE.Group();
    for (const { material, geos } of this.buckets.values()) {
      if (!geos.length) continue;
      const geo = mergeGeometries(geos, false);
      const mesh = new THREE.Mesh(geo, material);
      mesh.matrixAutoUpdate = false;
      group.add(mesh);
    }
    return group;
  }
}

const procMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.9,
  metalness: 0,
});

function placeMatrix(x, y, z, rotY = 0, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Matrix4().makeRotationY(rotY);
  m.scale(new THREE.Vector3(sx, sy, sz));
  m.setPosition(x, y, z);
  return m;
}

// Instanced field of cuttable props (grass tufts, pots). Supports removal.
export class CuttableField {
  constructor(geometry, material, cells, kind) {
    this.kind = kind;
    this.cells = cells; // [{c, r}]
    this.indexByCell = new Map();
    this.mesh = new THREE.InstancedMesh(geometry, material, Math.max(cells.length, 1));
    this.mesh.count = cells.length;
    const m = new THREE.Matrix4();
    cells.forEach(({ c, r }, i) => {
      const rot = cellHash(c, r) * Math.PI * 2;
      m.makeRotationY(rot).setPosition((c + 0.5) * TILE, 0, (r + 0.5) * TILE);
      this.mesh.setMatrixAt(i, m);
      this.indexByCell.set(`${c},${r}`, i);
    });
  }

  has(c, r) {
    return this.indexByCell.has(`${c},${r}`);
  }

  removeAt(c, r) {
    const key = `${c},${r}`;
    const i = this.indexByCell.get(key);
    if (i === undefined) return false;
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    this.mesh.setMatrixAt(i, zero);
    this.mesh.instanceMatrix.needsUpdate = true;
    this.indexByCell.delete(key);
    return true;
  }
}

export function buildMap(mapDef) {
  const grid = mapDef.grid;
  const rows = grid.length;
  const cols = grid[0].length;
  const collision = new CollisionGrid(cols, rows, TILE);
  const batcher = new StaticBatcher();
  const cuttableCells = {}; // kind -> [{c,r}]
  const waterCells = [];

  const at = (c, r) => (c < 0 || r < 0 || c >= cols || r >= rows ? null : grid[r][c]);
  const defAt = (c, r) => {
    const ch = at(c, r);
    return ch === null ? null : LEGEND[ch];
  };
  const isOpen = (c, r) => {
    const d = defAt(c, r);
    return d !== null && !d.solid;
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ch = grid[r][c];
      const def = LEGEND[ch];
      if (!def) throw new Error(`Map ${mapDef.id}: unknown tile '${ch}' at ${c},${r}`);
      const x = (c + 0.5) * TILE;
      const z = (r + 0.5) * TILE;
      const h = cellHash(c, r);

      if (def.solid) collision.setSolid(c, r, true);

      // --- floor surface ---
      const visible = !def.solid || def.wallStyle === 'tree' || def.wallStyle === 'rock'
        || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dc, dr]) => isOpen(c + dc, r + dr));
      if (visible) {
        switch (def.floor) {
          case 'stone': {
            const model = pickWeighted(FLOOR_VARIANTS.stone, h);
            batcher.addModel(model, placeMatrix(x, 0, z, Math.floor(h * 4) * (Math.PI / 2)));
            break;
          }
          case 'wood':
            // 4x4 plank piece scaled to one cell so any region shape works
            batcher.addModel('floor_wood_large', placeMatrix(x, 0, z, 0, 0.5, 1, 0.5));
            break;
          case 'grass':
          case 'dirt':
            batcher.addProcedural('ground', procMaterial,
              makeGroundCellGeometry(TILE, GROUND_COLORS[def.floor], h * 1000),
              placeMatrix(x, 0.001, z));
            break;
          case 'water':
            waterCells.push({ c, r });
            break;
        }
      }

      // --- solid cell dressing ---
      if (def.solid && def.wallStyle) {
        switch (def.wallStyle) {
          case 'dressed': {
            const edges = [
              { dc: 0, dr: 1, rot: 0, ox: 0, oz: TILE / 2 - 0.3 },
              { dc: 0, dr: -1, rot: Math.PI, ox: 0, oz: -TILE / 2 + 0.3 },
              { dc: 1, dr: 0, rot: -Math.PI / 2, ox: TILE / 2 - 0.3, oz: 0 },
              { dc: -1, dr: 0, rot: Math.PI / 2, ox: -TILE / 2 + 0.3, oz: 0 },
            ];
            for (const e of edges) {
              if (!isOpen(c + e.dc, r + e.dr)) continue;
              batcher.addModel('wall', placeMatrix(x + e.ox, 0, z + e.oz, e.rot, 0.5, WALL_SCALE_Y, 0.6));
            }
            if (hasOpenNeighbor8(c, r)) {
              batcher.addProcedural('caps', capMaterial,
                new THREE.PlaneGeometry(TILE, TILE).rotateX(-Math.PI / 2).toNonIndexed()
                  .applyMatrix4(placeMatrix(x, WALL_H, z)));
            }
            break;
          }
          case 'cliff':
            if (hasOpenNeighbor8(c, r)) {
              batcher.addProcedural('proc', procMaterial, makeCliffGeometry(TILE, WALL_H),
                placeMatrix(x, 0, z));
            }
            break;
          case 'tree':
            batcher.addProcedural('proc', procMaterial, makeTreeGeometry(c * 31 + r),
              placeMatrix(x, 0, z, 0, 1.15, 1.15, 1.15));
            break;
          case 'rock':
            batcher.addProcedural('proc', procMaterial, makeRockGeometry(c * 17 + r * 3),
              placeMatrix(x, 0, z));
            break;
        }
      }

      // --- props ---
      if (def.prop && !def.cuttable) {
        const rot = def.propSolid && (def.prop.startsWith('table') || def.prop.startsWith('shelf')
          || def.prop.startsWith('bed'))
          ? 0
          : Math.floor(h * 4) * (Math.PI / 2);
        batcher.addModel(def.prop, placeMatrix(x, 0, z, rot));
        if (def.propSolid) collision.setSolid(c, r, true);
      }

      // --- cuttables (instanced, destroyable) ---
      if (def.cuttable) {
        (cuttableCells[def.cuttable] ??= []).push({ c, r });
      }
    }
  }

  function hasOpenNeighbor8(c, r) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dc && !dr) continue;
        if (isOpen(c + dc, r + dr)) return true;
      }
    }
    return false;
  }

  const group = batcher.build();

  // --- water: one merged translucent plane, animated by World ---
  let waterMesh = null;
  if (waterCells.length) {
    const geos = waterCells.map(({ c, r }) =>
      new THREE.PlaneGeometry(TILE, TILE).rotateX(-Math.PI / 2)
        .translate((c + 0.5) * TILE, -0.22, (r + 0.5) * TILE).toNonIndexed());
    waterMesh = new THREE.Mesh(
      mergeGeometries(geos, false),
      new THREE.MeshStandardMaterial({
        color: 0x2f6fb8, transparent: true, opacity: 0.85, roughness: 0.35, metalness: 0,
      })
    );
    group.add(waterMesh);
  }

  // --- cuttable fields ---
  const cuttables = [];
  if (cuttableCells.grass) {
    const field = new CuttableField(makeGrassTuftGeometry(), procMaterial, cuttableCells.grass, 'grass');
    cuttables.push(field);
    group.add(field.mesh);
  }
  if (cuttableCells.pot) {
    const src = modelGeometries('barrel_small')[0];
    const geo = src.geometry.clone();
    geo.scale(0.8, 0.8, 0.8);
    const field = new CuttableField(geo, src.material, cuttableCells.pot, 'pot');
    cuttables.push(field);
    group.add(field.mesh);
  }

  return { group, collision, waterMesh, cuttables, cols, rows };
}

const capMaterial = new THREE.MeshStandardMaterial({ color: 0x3d3a45, roughness: 1, metalness: 0 });
