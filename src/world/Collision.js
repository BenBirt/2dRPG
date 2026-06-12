// Grid-based collision. The static layer comes from the map legend; dynamic
// blockers (closed doors, cracked walls, pushed-in props) register a cell on
// top of it and can be removed at runtime.
const EPS = 1e-4;

export class CollisionGrid {
  constructor(cols, rows, tile) {
    this.cols = cols;
    this.rows = rows;
    this.tile = tile;
    this.solid = new Uint8Array(cols * rows);
    this.blockers = new Map(); // id -> cell index
    this.blockCount = new Uint16Array(cols * rows);
  }

  index(c, r) {
    return r * this.cols + c;
  }

  setSolid(c, r, v) {
    this.solid[this.index(c, r)] = v ? 1 : 0;
  }

  isSolidCell(c, r) {
    if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return true;
    const i = this.index(c, r);
    return this.solid[i] === 1 || this.blockCount[i] > 0;
  }

  addBlocker(id, c, r) {
    if (this.blockers.has(id)) return;
    const i = this.index(c, r);
    this.blockers.set(id, i);
    this.blockCount[i]++;
  }

  removeBlocker(id) {
    const i = this.blockers.get(id);
    if (i === undefined) return;
    this.blockers.delete(id);
    this.blockCount[i]--;
  }

  cellAt(x, z) {
    return [Math.floor(x / this.tile), Math.floor(z / this.tile)];
  }

  circleHitsSolid(x, z, radius) {
    const t = this.tile;
    const c0 = Math.floor((x - radius) / t);
    const c1 = Math.floor((x + radius) / t);
    const r0 = Math.floor((z - radius) / t);
    const r1 = Math.floor((z + radius) / t);
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (!this.isSolidCell(c, r)) continue;
        // closest point on the cell AABB to the circle centre
        const px = Math.max(c * t, Math.min(x, (c + 1) * t));
        const pz = Math.max(r * t, Math.min(z, (r + 1) * t));
        const dx = x - px;
        const dz = z - pz;
        if (dx * dx + dz * dz < radius * radius) return true;
      }
    }
    return false;
  }

  // Axis-separated move with slide. Returns final position plus which axes hit.
  moveCircle(x, z, radius, dx, dz) {
    const t = this.tile;
    let hitX = false;
    let hitZ = false;

    let nx = x + dx;
    if (dx !== 0 && this.circleHitsSolid(nx, z, radius)) {
      hitX = true;
      // clamp to the boundary of the cell column we ran into
      if (dx > 0) {
        const edge = Math.floor((nx + radius) / t) * t;
        nx = Math.max(x, edge - radius - EPS);
      } else {
        const edge = (Math.floor((nx - radius) / t) + 1) * t;
        nx = Math.min(x, edge + radius + EPS);
      }
      if (this.circleHitsSolid(nx, z, radius)) nx = x;
    }

    let nz = z + dz;
    if (dz !== 0 && this.circleHitsSolid(nx, nz, radius)) {
      hitZ = true;
      if (dz > 0) {
        const edge = Math.floor((nz + radius) / t) * t;
        nz = Math.max(z, edge - radius - EPS);
      } else {
        const edge = (Math.floor((nz - radius) / t) + 1) * t;
        nz = Math.min(z, edge + radius + EPS);
      }
      if (this.circleHitsSolid(nx, nz, radius)) nz = z;
    }

    return { x: nx, z: nz, hitX, hitZ };
  }

  // DDA raycast against solid cells. Returns distance to first hit, or null.
  raycast(x, z, dirX, dirZ, maxDist) {
    const t = this.tile;
    let c = Math.floor(x / t);
    let r = Math.floor(z / t);
    if (this.isSolidCell(c, r)) return 0;

    const stepC = dirX > 0 ? 1 : -1;
    const stepR = dirZ > 0 ? 1 : -1;
    const tDeltaX = dirX !== 0 ? Math.abs(t / dirX) : Infinity;
    const tDeltaZ = dirZ !== 0 ? Math.abs(t / dirZ) : Infinity;
    let tMaxX = dirX !== 0
      ? ((dirX > 0 ? (c + 1) * t - x : x - c * t)) / Math.abs(dirX)
      : Infinity;
    let tMaxZ = dirZ !== 0
      ? ((dirZ > 0 ? (r + 1) * t - z : z - r * t)) / Math.abs(dirZ)
      : Infinity;

    let dist = 0;
    while (dist <= maxDist) {
      if (tMaxX < tMaxZ) {
        dist = tMaxX;
        tMaxX += tDeltaX;
        c += stepC;
      } else {
        dist = tMaxZ;
        tMaxZ += tDeltaZ;
        r += stepR;
      }
      if (dist > maxDist) return null;
      if (this.isSolidCell(c, r)) return dist;
    }
    return null;
  }

  // Line-of-sight helper for enemy AI.
  hasLineOfSight(x0, z0, x1, z1) {
    const dx = x1 - x0;
    const dz = z1 - z0;
    const dist = Math.hypot(dx, dz);
    if (dist < EPS) return true;
    return this.raycast(x0, z0, dx / dist, dz / dist, dist) === null;
  }
}
