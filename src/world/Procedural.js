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

export function makeGroundCellGeometry(tile, color, cx, cz) {
  const geo = new THREE.PlaneGeometry(tile, tile, 2, 2).toNonIndexed();
  geo.deleteAttribute('uv');
  geo.rotateX(-Math.PI / 2);
  const base = new THREE.Color(color);
  const pos = geo.attributes.position;
  const count = pos.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const wx = cx + pos.getX(i);
    const wz = cz + pos.getZ(i);
    const n = groundNoise(wx, wz);           // -1..1
    const shade = 1 + n * 0.1;               // brightness wobble
    const warm = n * 0.03;                    // slight hue drift
    _tmpCol.copy(base).multiplyScalar(shade);
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
};

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
