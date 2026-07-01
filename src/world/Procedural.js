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

// A pine-ish tree: trunk + two foliage cones. ~60 tris.
export function makeTreeGeometry(seed = 0) {
  const s = 0.9 + ((seed * 37) % 10) / 40;
  const trunk = paint(
    new THREE.CylinderGeometry(0.16, 0.22, 0.7, 6).toNonIndexed(),
    0x6e4a2e, 0.03
  );
  trunk.translate(0, 0.35, 0);
  const lower = paint(new THREE.ConeGeometry(0.95, 1.2, 7).toNonIndexed(), 0x3f7d3a, 0.04);
  lower.translate(0, 1.15, 0);
  const upper = paint(new THREE.ConeGeometry(0.65, 1.0, 7).toNonIndexed(), 0x4c9145, 0.04);
  upper.translate(0, 1.85, 0);
  const geo = merged([trunk, lower, upper]);
  geo.scale(s, s, s);
  geo.rotateY((seed % 7) * 0.9);
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

// Tall-grass tuft: three crossed quads. Used as InstancedMesh geometry.
export function makeGrassTuftGeometry() {
  const parts = [];
  for (let i = 0; i < 3; i++) {
    const quad = new THREE.PlaneGeometry(0.55, 0.65).toNonIndexed();
    paint(quad, 0x4d8f3f, 0.06);
    quad.translate(0, 0.32, 0);
    quad.rotateY((i * Math.PI) / 3);
    parts.push(quad);
  }
  return merged(parts);
}

// Cliff block filling one solid overworld cell.
export function makeCliffGeometry(tile, height) {
  const geo = new THREE.BoxGeometry(tile, height, tile).toNonIndexed();
  paint(geo, 0x7c7568, 0.045);
  geo.translate(0, height / 2, 0);
  return geo;
}

// Ground quad (one cell) for grass/dirt, with slight per-vertex tint.
export function makeGroundCellGeometry(tile, color, seed) {
  const geo = new THREE.PlaneGeometry(tile, tile).toNonIndexed();
  geo.deleteAttribute('uv');
  geo.rotateX(-Math.PI / 2);
  const col = new THREE.Color(color);
  const count = geo.attributes.position.count;
  const colors = new Float32Array(count * 3);
  const j = ((Math.sin(seed * 12.9898) * 43758.5453) % 1) * 0.045;
  for (let i = 0; i < count; i++) {
    colors[i * 3] = THREE.MathUtils.clamp(col.r + j, 0, 1);
    colors[i * 3 + 1] = THREE.MathUtils.clamp(col.g + j, 0, 1);
    colors[i * 3 + 2] = THREE.MathUtils.clamp(col.b + j, 0, 1);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

export const GROUND_COLORS = {
  grass: 0x5da14c,
  dirt: 0xa3815a,
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
