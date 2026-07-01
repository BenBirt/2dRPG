import { TILE, STEP } from '../data/balance.js';

// Terrain elevation for a map. Backward compatible: a map with no `heights`
// grid is entirely level 0 (flat), identical to the pre-height behaviour.
//
// Elevation is authored as an optional `heights` array of equal-length digit
// strings parallel to `grid` ('0'-'9' → level). Raised regions are plateaus
// walled by solid cliff cells; `ramps` (`[{x,y,dir}]`, dir = uphill n/s/e/w)
// are walkable sloped cells that let the player climb between levels — the
// player's Y follows the slope, so no edge-collision is required.
export class Heightfield {
  constructor(mapDef, cols, rows) {
    this.cols = cols;
    this.rows = rows;
    this.levels = new Int8Array(cols * rows); // per-cell elevation level
    const h = mapDef.heights;
    if (h) {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const ch = h[r]?.[c];
          this.levels[r * cols + c] = ch && ch !== '.' ? (ch.charCodeAt(0) - 48) : 0;
        }
      }
    }
    // ramp cells keyed "c,r" → { dir, lo, hi }
    this.ramps = new Map();
    for (const rp of mapDef.ramps || []) {
      const lvl = this.level(rp.x, rp.y);
      // uphill neighbour's level is the high end; opposite is the low end
      const d = DIRV[rp.dir];
      const hi = Math.max(this.level(rp.x + d.x, rp.y + d.z), lvl + 1);
      const lo = Math.min(this.level(rp.x - d.x, rp.y - d.z), lvl);
      this.ramps.set(`${rp.x},${rp.y}`, { dir: rp.dir, lo, hi });
    }
    this.hasElevation = !!h || this.ramps.size > 0;
  }

  level(c, r) {
    if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return 0;
    return this.levels[r * this.cols + c];
  }

  // World-space ground height at (x, z), interpolating across ramp cells.
  heightAt(x, z) {
    const c = Math.floor(x / TILE);
    const r = Math.floor(z / TILE);
    const ramp = this.ramps.get(`${c},${r}`);
    if (ramp) {
      // fraction across the cell along the uphill axis, 0 at low edge → 1 at high
      const fx = x / TILE - c;
      const fz = z / TILE - r;
      let t;
      switch (ramp.dir) {
        case 'n': t = 1 - fz; break; // uphill toward -z
        case 's': t = fz; break;
        case 'w': t = 1 - fx; break;
        case 'e': t = fx; break;
        default: t = 0;
      }
      return (ramp.lo + (ramp.hi - ramp.lo) * clamp01(t)) * STEP;
    }
    return this.level(c, r) * STEP;
  }
}

const DIRV = {
  n: { x: 0, z: -1 }, s: { x: 0, z: 1 }, e: { x: 1, z: 0 }, w: { x: -1, z: 0 },
};

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
