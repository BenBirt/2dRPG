import * as THREE from 'three';

// Procedural low-poly props (vertex-colored, flat-shaded) for the overworld,
// matching the KayKit aesthetic without extra asset downloads.

function paint(geometry, color, jitter = 0) {
  // vertex-colored geometry carries no uv so all procedural pieces merge
  // into one bucket with a consistent attribute set
  geometry.deleteAttribute('uv');
  const col = new THREE.Color(color);
  const count = geometry.attributes.position.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const j = jitter ? (Math.sin(i * 12.9898) * 43758.5453 % 1) * jitter : 0;
    colors[i * 3] = THREE.MathUtils.clamp(col.r + j, 0, 1);
    colors[i * 3 + 1] = THREE.MathUtils.clamp(col.g + j, 0, 1);
    colors[i * 3 + 2] = THREE.MathUtils.clamp(col.b + j, 0, 1);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

function merged(parts) {
  // local minimal merge: assumes identical attribute sets (position/normal/color)
  let total = 0;
  for (const g of parts) total += g.attributes.position.count;
  const geo = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'color']) {
    const itemSize = 3;
    const arr = new Float32Array(total * itemSize);
    let off = 0;
    for (const g of parts) {
      arr.set(g.attributes[name].array, off);
      off += g.attributes[name].array.length;
    }
    geo.setAttribute(name, new THREE.BufferAttribute(arr, itemSize));
  }
  return geo;
}

function transformed(geo, x, y, z, scale = 1, rotY = 0) {
  const m = new THREE.Matrix4()
    .makeRotationY(rotY)
    .premultiply(new THREE.Matrix4().makeScale(scale, scale, scale))
    .setPosition(x, y, z);
  return geo.applyMatrix4(m);
}

// A rounded storybook tree: tapered trunk + clustered foliage blobs. Three
// silhouettes (round / tall / broad) chosen by seed, each with its own green,
// for a varied canopy instead of a field of identical cones. ~120 tris.
const FOLIAGE_GREENS = [0x4f9a41, 0x3f8636, 0x5aa84c, 0x468f3d, 0x63ad50];

export function makeTreeGeometry(seed = 0) {
  const rnd = (n) => ((Math.sin((seed + 1) * (n * 97.13 + 3.7)) * 43758.5453) % 1 + 1) % 1;
  const s = 0.85 + rnd(1) * 0.5;
  const shape = seed % 3;
  const green = FOLIAGE_GREENS[seed % FOLIAGE_GREENS.length];
  const dark = new THREE.Color(green).multiplyScalar(0.82).getHex();

  const trunk = paint(
    new THREE.CylinderGeometry(0.13, 0.2, 0.85, 6).toNonIndexed(), 0x7a5230, 0.03
  );
  trunk.translate(0, 0.42, 0);
  const parts = [trunk];

  const blob = (r, y, ox, oz, detail, col) => {
    const g = paint(new THREE.IcosahedronGeometry(r, detail).toNonIndexed(), col, 0.04);
    g.scale(1, 0.92, 1);
    g.translate(ox, y, oz);
    parts.push(g);
  };

  if (shape === 0) {
    // round bushy canopy — a cluster of overlapping blobs
    blob(0.85, 1.35, 0, 0, 1, green);
    blob(0.6, 1.15, 0.55, 0.2, 1, dark);
    blob(0.58, 1.2, -0.5, -0.3, 1, dark);
    blob(0.5, 1.75, 0.1, 0.1, 1, green);
  } else if (shape === 1) {
    // tall stacked canopy
    blob(0.7, 1.25, 0, 0, 1, dark);
    blob(0.62, 1.75, 0.1, 0.05, 1, green);
    blob(0.46, 2.2, -0.05, 0, 1, green);
  } else {
    // broad low canopy
    blob(0.95, 1.2, 0, 0, 1, green);
    blob(0.62, 1.05, 0.7, 0.35, 1, dark);
    blob(0.62, 1.05, -0.65, -0.35, 1, dark);
  }

  const geo = merged(parts);
  geo.scale(s, s, s);
  geo.rotateY(rnd(2) * Math.PI * 2);
  return geo;
}

// A squat boulder. ~40 tris.
export function makeRockGeometry(seed = 0) {
  const geo = paint(new THREE.IcosahedronGeometry(0.75, 0).toNonIndexed(), 0x8a8d93, 0.05);
  geo.scale(1.1, 0.7 + ((seed * 13) % 10) / 50, 1.0);
  geo.rotateY(seed * 1.7);
  geo.translate(0, 0.45, 0);
  return geo;
}

// Cuttable grass tuft: a small cluster of upright blades that reads as a
// leafy bush from the tilted top-down camera. Used as InstancedMesh geometry.
export function makeGrassTuftGeometry() {
  const parts = [];
  const blade = (ox, oz, h, tilt, dir, col) => {
    const g = new THREE.ConeGeometry(0.14, h, 4).toNonIndexed();
    paint(g, col, 0.05);
    g.rotateZ(tilt);
    g.rotateY(dir);
    g.translate(ox, h * 0.42, oz);
    parts.push(g);
  };
  const light = 0x7cc255;
  const mid = 0x66ad45;
  blade(0, 0, 0.62, 0, 0, light);
  blade(0.16, 0.05, 0.5, 0.3, 0.4, mid);
  blade(-0.15, -0.04, 0.52, -0.32, 1.1, mid);
  blade(0.05, -0.16, 0.46, 0.28, 2.0, light);
  blade(-0.07, 0.15, 0.44, -0.26, 2.6, mid);
  return merged(parts);
}

// Cliff block filling one solid overworld cell.
export function makeCliffGeometry(tile, height) {
  const geo = new THREE.BoxGeometry(tile, height, tile).toNonIndexed();
  paint(geo, 0x7c7568, 0.045);
  geo.translate(0, height / 2, 0);
  return geo;
}

// A sloped floor tile bridging two elevations along `dir` (uphill). Centred on
// the cell origin; caller places it. Coloured to match the floor it joins.
export function makeRampGeometry(tile, loY, hiY, dir, color) {
  const geo = new THREE.PlaneGeometry(tile, tile, 1, 1).toNonIndexed();
  geo.deleteAttribute('uv');
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const lx = pos.getX(i) / tile + 0.5; // 0..1 across cell (west→east)
    const lz = pos.getZ(i) / tile + 0.5; // 0..1 across cell (north→south)
    let t;
    switch (dir) {
      case 'n': t = 1 - lz; break;
      case 's': t = lz; break;
      case 'w': t = 1 - lx; break;
      case 'e': t = lx; break;
      default: t = 0;
    }
    pos.setY(i, loY + (hiY - loY) * t);
  }
  geo.computeVertexNormals();
  paint(geo, color, 0.04);
  return geo;
}

// Small decorative ground detail (flowers / mushrooms / pebbles) chosen by
// seed. Non-solid, non-interactive — pure visual richness.
export function makeDetailGeometry(seed, hsh) {
  const kind = seed % 3;
  if (kind === 0) {
    // flower cluster: thin stems + bright caps
    const parts = [];
    const colors = [0xe8d23a, 0xe86a6a, 0xd07adf, 0xf0f0f0];
    const n = 2 + (seed % 3);
    for (let i = 0; i < n; i++) {
      const ox = ((hsh * (i + 3) * 37) % 1 - 0.5) * 0.8;
      const oz = ((hsh * (i + 7) * 53) % 1 - 0.5) * 0.8;
      const stem = paint(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 3).toNonIndexed(), 0x4c8a3a);
      stem.translate(ox, 0.15, oz);
      const cap = paint(new THREE.IcosahedronGeometry(0.09, 0).toNonIndexed(), colors[(seed + i) % colors.length], 0.03);
      cap.scale(1, 0.6, 1);
      cap.translate(ox, 0.32, oz);
      parts.push(stem, cap);
    }
    return merged(parts);
  }
  if (kind === 1) {
    // mushroom trio
    const parts = [];
    for (let i = 0; i < 3; i++) {
      const ox = ((hsh * (i + 2) * 29) % 1 - 0.5) * 0.7;
      const oz = ((hsh * (i + 5) * 41) % 1 - 0.5) * 0.7;
      const s = 0.6 + ((seed + i) % 3) * 0.2;
      const stem = paint(new THREE.CylinderGeometry(0.04, 0.05, 0.14 * s, 5).toNonIndexed(), 0xe8e0cc);
      stem.translate(ox, 0.07 * s, oz);
      const cap = paint(new THREE.SphereGeometry(0.11 * s, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2).toNonIndexed(), 0xc0432f, 0.03);
      cap.translate(ox, 0.14 * s, oz);
      parts.push(stem, cap);
    }
    return merged(parts);
  }
  // pebble cluster
  const parts = [];
  for (let i = 0; i < 3; i++) {
    const ox = ((hsh * (i + 1) * 23) % 1 - 0.5) * 0.9;
    const oz = ((hsh * (i + 4) * 61) % 1 - 0.5) * 0.9;
    const g = paint(new THREE.IcosahedronGeometry(0.1 + (i % 2) * 0.05, 0).toNonIndexed(), 0x9a968c, 0.05);
    g.scale(1.2, 0.6, 1.1);
    g.translate(ox, 0.05, oz);
    parts.push(g);
  }
  return merged(parts);
}

// A picket-fence cell: centre post plus rails running toward each connected
// neighbour (n/e/s/w booleans), so runs read as continuous fences and corners
// turn properly. ~30 tris.
export function makeFenceGeometry(n, e, s, w) {
  const wood = 0x9a7448;
  const dark = 0x7a5a36;
  const parts = [];
  const post = (x, z) => {
    const g = paint(new THREE.BoxGeometry(0.14, 0.95, 0.14).toNonIndexed(), dark, 0.03);
    g.translate(x, 0.48, z);
    parts.push(g);
  };
  post(0, 0);
  const rail = (dx, dz) => {
    // two rails from the centre post halfway to the neighbour cell
    for (const y of [0.35, 0.7]) {
      const len = 1.0;
      const g = paint(new THREE.BoxGeometry(dx ? len : 0.09, 0.09, dz ? len : 0.09).toNonIndexed(), wood, 0.04);
      g.translate(dx * len / 2, y, dz * len / 2);
      parts.push(g);
    }
  };
  if (n) rail(0, -1);
  if (s) rail(0, 1);
  if (e) rail(1, 0);
  if (w) rail(-1, 0);
  if (!n && !s && !e && !w) rail(1, 0); // isolated cell still shows something
  return merged(parts);
}

// The village well: stone ring, two posts, a little cone roof, dark water.
export function makeWellGeometry() {
  const parts = [];
  const ring = paint(new THREE.CylinderGeometry(0.7, 0.78, 0.7, 10, 1, true).toNonIndexed(), 0x8a8478, 0.05);
  ring.translate(0, 0.35, 0);
  parts.push(ring);
  const water = paint(new THREE.CircleGeometry(0.62, 10).toNonIndexed(), 0x1d3a52, 0.02);
  water.rotateX(-Math.PI / 2);
  water.translate(0, 0.55, 0);
  parts.push(water);
  for (const sx of [-0.6, 0.6]) {
    const p = paint(new THREE.BoxGeometry(0.12, 1.5, 0.12).toNonIndexed(), 0x7a5a36, 0.03);
    p.translate(sx, 0.75, 0);
    parts.push(p);
  }
  const roof = paint(new THREE.ConeGeometry(1.05, 0.6, 4).toNonIndexed(), 0xa8543a, 0.04);
  roof.rotateY(Math.PI / 4);
  roof.translate(0, 1.75, 0);
  parts.push(roof);
  return merged(parts);
}

// Distant, unreachable backdrop scenery for open-air maps: a wide sea, a ring
// of hazy mountains beyond the coast, and a few far islands. Everything is
// vertex-coloured and merged into one Group; it sits outside the play area and
// recedes into the fog for depth. Returns a THREE.Group.
export function makeBackdrop(cols, rows, tile) {
  const group = new THREE.Group();
  const cx = (cols * tile) / 2;
  const cz = (rows * tile) / 2;
  const span = Math.max(cols, rows) * tile;

  // deterministic pseudo-random from an index
  const rnd = (i, s) => ((Math.sin((i + 1) * (s * 78.233 + 12.9898)) * 43758.5453) % 1 + 1) % 1;

  // Distance from the map centre to the edge of the map RECTANGLE along a
  // given angle (+ margin). Backdrop scenery is placed at least this far out
  // so nothing ever lands inside the playfield — a circle radius on a
  // non-square map would (and did) intrude on the shorter axis.
  const hw = (cols * tile) / 2;
  const hh = (rows * tile) / 2;
  const rectExit = (ang, margin) => {
    const dx = Math.cos(ang);
    const dz = Math.sin(ang);
    const tx = Math.abs(dx) > 1e-6 ? (hw + margin) / Math.abs(dx) : Infinity;
    const tz = Math.abs(dz) > 1e-6 ? (hh + margin) / Math.abs(dz) : Infinity;
    return Math.min(tx, tz);
  };

  // --- wide sea plane, low, extending to the horizon ---
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(span * 4, span * 4).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x2b6fb0, roughness: 0.25, metalness: 0.1 })
  );
  sea.position.set(cx, -0.9, cz);
  group.add(sea);

  // --- opaque earth base under the map INTERIOR so gaps between floor/wall
  // tiles show ground, not the sea below. Inset one tile: where the border
  // ring meets open water the sea runs visibly to the horizon instead of a
  // dark earth band. ---
  const base = new THREE.Mesh(
    new THREE.PlaneGeometry((cols - 2) * tile, (rows - 2) * tile).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x3f3a30, roughness: 1 })
  );
  base.position.set(cx, -0.4, cz);
  group.add(base);

  // --- ring of hazy mountains beyond the coast (tall, so their peaks rise
  // above the play area into view under the steep top-down camera) ---
  const mtnParts = [];
  const count = 52;
  for (let i = 0; i < count; i++) {
    const ang = (i / count) * Math.PI * 2 + rnd(i, 3) * 0.12;
    // always beyond the map rectangle, whatever its aspect ratio
    const rr = rectExit(ang, 14) + rnd(i, 7) * span * 0.3;
    const mx = cx + Math.cos(ang) * rr;
    const mz = cz + Math.sin(ang) * rr;
    const h = 16 + rnd(i, 11) * 26;
    const rad = 7 + rnd(i, 13) * 9;
    const cone = new THREE.ConeGeometry(rad, h, 5 + (i % 3)).toNonIndexed();
    // atmospheric blue-grey, lighter with height (snowier peaks)
    const base = new THREE.Color(0x5a6d84).lerp(new THREE.Color(0x9fb0c6), rnd(i, 17));
    paint(cone, base.getHex(), 0.03);
    cone.translate(mx, h / 2 - 1, mz);
    mtnParts.push(cone);
  }
  const mountains = new THREE.Mesh(merged(mtnParts),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, fog: true }));
  group.add(mountains);

  // --- a few flat far islands dotted in the sea ---
  const islParts = [];
  for (let i = 0; i < 7; i++) {
    const ang = rnd(i, 23) * Math.PI * 2;
    // islands sit in open sea, clearly past the coast
    const rr = rectExit(ang, 8) + rnd(i, 29) * span * 0.18;
    const ix = cx + Math.cos(ang) * rr;
    const iz = cz + Math.sin(ang) * rr;
    const s = 3 + rnd(i, 31) * 5;
    const isle = new THREE.IcosahedronGeometry(s, 0).toNonIndexed();
    isle.scale(1.4, 0.28, 1.4);
    paint(isle, 0x4f8a44, 0.04);
    isle.translate(ix, -0.2, iz);
    islParts.push(isle);
  }
  const islands = new THREE.Mesh(merged(islParts),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 }));
  group.add(islands);

  return group;
}

// Animated waterfall sheet: a vertical translucent plane down a cliff face.
// Returned as a Mesh (animated by World via userData.scroll).
const waterfallMat = new THREE.MeshStandardMaterial({
  color: 0xd6ecfb, transparent: true, opacity: 0.85, roughness: 0.08, metalness: 0.1,
  emissive: 0x9fd4f0, emissiveIntensity: 0.4, side: THREE.DoubleSide,
});
export function makeWaterfallGeometry(tile, topY, botY, dir) {
  const height = Math.max(topY - botY, 0.5);
  const geo = new THREE.PlaneGeometry(tile * 0.9, height, 1, 6);
  // face outward along dir; default plane faces +z
  const rot = { s: 0, n: Math.PI, e: -Math.PI / 2, w: Math.PI / 2 }[dir] ?? 0;
  const mat = waterfallMat.clone();
  // scrolling stripe texture = visibly falling water (World scrolls offset.y)
  mat.map = getFlowTexture().clone();
  mat.map.wrapS = mat.map.wrapT = THREE.RepeatWrapping;
  mat.map.repeat.set(1, Math.max(1, height / 2));
  mat.map.needsUpdate = true;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.y = rot;
  mesh.position.y = (topY + botY) / 2;
  // nudge to the cliff face edge
  const off = tile / 2 - 0.02;
  if (dir === 's') mesh.position.z = off;
  else if (dir === 'n') mesh.position.z = -off;
  else if (dir === 'e') mesh.position.x = off;
  else if (dir === 'w') mesh.position.x = -off;
  mesh.userData.waterfall = true;
  return mesh;
}

// Ground cell for grass/dirt. Subdivided and shaded PER VERTEX from smooth
// world-position noise so neighbouring cells blend into an organic field
// instead of a flat checkerboard. `cx,cz` are the cell's world centre.
const _tmpCol = new THREE.Color();
function groundNoise(x, z) {
  // two octaves of cheap value noise, range ~[-1,1]
  const n1 = Math.sin(x * 0.7 + 1.3) * Math.cos(z * 0.6 - 0.7);
  const n2 = Math.sin(x * 1.9 - 2.1) * Math.cos(z * 2.3 + 0.4);
  return n1 * 0.7 + n2 * 0.3;
}

const _blendCol = new THREE.Color();
export function makeGroundCellGeometry(tile, color, cx, cz, blend = null) {
  const geo = new THREE.PlaneGeometry(tile, tile, 2, 2).toNonIndexed();
  geo.deleteAttribute('uv');
  geo.rotateX(-Math.PI / 2);
  const base = new THREE.Color(color);
  if (blend) _blendCol.set(blend.color);
  const pos = geo.attributes.position;
  const count = pos.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const wx = cx + pos.getX(i);
    const wz = cz + pos.getZ(i);
    const n = groundNoise(wx, wz);           // -1..1
    const shade = 1 + n * 0.1;               // brightness wobble
    const warm = n * 0.03;                    // slight hue drift
    _tmpCol.copy(base);
    // optional per-vertex blend toward a second colour (e.g. wet sand near
    // water) — smooth gradients instead of per-cell colour blocks
    if (blend) {
      const k = blend.fn(wx, wz);
      if (k > 0) _tmpCol.lerp(_blendCol, Math.min(1, k));
    }
    _tmpCol.multiplyScalar(shade);
    colors[i * 3] = THREE.MathUtils.clamp(_tmpCol.r + warm, 0, 1);
    colors[i * 3 + 1] = THREE.MathUtils.clamp(_tmpCol.g, 0, 1);
    colors[i * 3 + 2] = THREE.MathUtils.clamp(_tmpCol.b - warm * 0.5, 0, 1);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

export const GROUND_COLORS = {
  grass: 0x63ad4e,
  dirt: 0xb08a5c,
  sand: 0xd9c391,
};

// The broken hull of the knight's ship: a keel beam with pairs of curved ribs
// rising from the sand, a snapped mast, and strewn planks — show, don't tell.
export function makeWreckGeometry(seed = 0) {
  const rnd = (n) => ((Math.sin((seed + 2) * (n * 91.7 + 7.3)) * 43758.5453) % 1 + 1) % 1;
  const wood = 0x6e4f33;
  const weathered = 0x8a7050;
  const parts = [];

  // keel: a long half-buried beam
  const keel = paint(new THREE.BoxGeometry(0.28, 0.34, 5.6).toNonIndexed(), wood, 0.05);
  keel.translate(0, -0.02, 0);
  parts.push(keel);

  // rib pairs: torus arcs standing out of the sand, wider amidships. The
  // torus lies in the XY plane (X = athwartships, Y = up), tube axis along Z
  // (the keel) — exactly a rib's plane, so no reorientation is needed: the
  // starboard rib is the arc from the waterline (angle 0) up past vertical,
  // and the port rib is its mirror.
  for (let i = 0; i < 5; i++) {
    const z = -2.2 + i * 1.1;
    const r = 1.05 - Math.abs(i - 2) * 0.22 + rnd(i) * 0.08;
    for (const side of [-1, 1]) {
      const arcLen = Math.PI * (0.42 + rnd(i * 3 + side) * 0.12);
      const rib = paint(new THREE.TorusGeometry(r, 0.07, 5, 8, arcLen).toNonIndexed(),
        i % 2 ? wood : weathered, 0.05);
      if (side < 0) rib.rotateY(Math.PI); // mirror for the port side
      rib.rotateZ(side * -0.1);            // slight outward lean
      rib.translate(0, -0.15, z);          // hull sunk a little into the sand
      parts.push(rib);
    }
  }

  // snapped mast leaning across the wreck
  const mast = paint(new THREE.CylinderGeometry(0.09, 0.12, 3.4, 6).toNonIndexed(), weathered, 0.04);
  mast.rotateZ(1.15);
  mast.rotateY(0.5);
  mast.translate(0.8, 0.7, 0.6);
  parts.push(mast);

  // strewn planks half-sunk in the sand
  for (let i = 0; i < 6; i++) {
    const p = paint(new THREE.BoxGeometry(0.18, 0.06, 0.9 + rnd(i * 7) * 0.7).toNonIndexed(),
      i % 2 ? wood : weathered, 0.06);
    p.rotateY(rnd(i * 11) * Math.PI);
    p.translate((rnd(i * 13) - 0.5) * 4.5, 0.03, (rnd(i * 17) - 0.5) * 5.5);
    parts.push(p);
  }
  return merged(parts);
}

// Beach detail: driftwood, shells, seaweed, wet pebbles — chosen by seed.
export function makeBeachDetailGeometry(seed, hsh) {
  const kind = seed % 3;
  const parts = [];
  if (kind === 0) {
    // driftwood branch
    const g = paint(new THREE.CylinderGeometry(0.05, 0.08, 0.9 + hsh, 5).toNonIndexed(), 0x9a8266, 0.06);
    g.rotateZ(Math.PI / 2);
    g.rotateY(hsh * Math.PI);
    g.translate(0, 0.06, 0);
    parts.push(g);
  } else if (kind === 1) {
    // little shell cluster (pale flecks)
    for (let i = 0; i < 3; i++) {
      const s = paint(new THREE.IcosahedronGeometry(0.06 + (i % 2) * 0.03, 0).toNonIndexed(),
        i % 2 ? 0xf0e7d6 : 0xe0b8a8, 0.03);
      s.scale(1.3, 0.5, 1);
      s.translate((hsh * (i + 3) * 37 % 1 - 0.5) * 1.0, 0.03, (hsh * (i + 5) * 53 % 1 - 0.5) * 1.0);
      parts.push(s);
    }
  } else {
    // washed-up seaweed strand
    for (let i = 0; i < 3; i++) {
      const w = paint(new THREE.BoxGeometry(0.5 + hsh * 0.4, 0.03, 0.09).toNonIndexed(), 0x3c6b46, 0.05);
      w.rotateY(hsh * 6 + i * 0.9);
      w.translate((hsh * (i + 2) * 29 % 1 - 0.5) * 0.9, 0.02, (hsh * (i + 4) * 41 % 1 - 0.5) * 0.9);
      parts.push(w);
    }
  }
  return merged(parts);
}

// Repeating stripe texture that scrolls down waterfall sheets so they read as
// falling water rather than a static pane.
let flowTexture = null;
export function getFlowTexture() {
  if (flowTexture) return flowTexture;
  const c = document.createElement('canvas');
  c.width = 32; c.height = 64;
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 64);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.35, '#cfe6f5');
  grad.addColorStop(0.6, '#ffffff');
  grad.addColorStop(1, '#bcd9ec');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 32, 64);
  // brighter streaks
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  for (let i = 0; i < 5; i++) ctx.fillRect(3 + i * 6, (i * 17) % 40, 2, 26);
  flowTexture = new THREE.CanvasTexture(c);
  flowTexture.wrapS = flowTexture.wrapT = THREE.RepeatWrapping;
  return flowTexture;
}

// Shared blob-shadow texture (radial gradient), created once.
let blobTexture = null;
export function getBlobShadowTexture() {
  if (blobTexture) return blobTexture;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
  grad.addColorStop(0, 'rgba(0,0,0,0.42)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  blobTexture = new THREE.CanvasTexture(c);
  return blobTexture;
}

// Enable real cast/receive shadows on every mesh under an object.
export function enableShadows(obj, { cast = true, receive = true } = {}) {
  obj.traverse((n) => {
    if (n.isMesh || n.isSkinnedMesh) {
      n.castShadow = cast;
      n.receiveShadow = receive;
    }
  });
  return obj;
}

export function makeBlobShadow(radius = 0.5) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 2.4, radius * 2.4),
    new THREE.MeshBasicMaterial({
      map: getBlobShadowTexture(),
      transparent: true,
      depthWrite: false,
    })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.02;
  mesh.renderOrder = 1;
  return mesh;
}
