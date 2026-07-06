// Tiny helpers for authoring large maps in code instead of giant ASCII
// blocks. Everything is deterministic (seeded) so maps never shift between
// loads.
export function makeGrid(w, h, fill = 'g') {
  return Array.from({ length: h }, () => Array(w).fill(fill));
}

export function set(g, x, y, ch) {
  if (y >= 0 && y < g.length && x >= 0 && x < g[0].length) g[y][x] = ch;
}

export function get(g, x, y) {
  return g[y]?.[x];
}

export function fillRect(g, x, y, w, h, ch) {
  for (let r = y; r < y + h; r++) {
    for (let c = x; c < x + w; c++) set(g, c, r, ch);
  }
}

export function outlineRect(g, x, y, w, h, ch) {
  for (let c = x; c < x + w; c++) {
    set(g, c, y, ch);
    set(g, c, y + h - 1, ch);
  }
  for (let r = y; r < y + h; r++) {
    set(g, x, r, ch);
    set(g, x + w - 1, r, ch);
  }
}

// L-shaped path from (x0,y0) to (x1,y1), horizontal first.
export function path(g, x0, y0, x1, y1, ch = 'd', width = 1) {
  const dir = x1 >= x0 ? 1 : -1;
  for (let c = x0; c !== x1 + dir; c += dir) {
    for (let wofs = 0; wofs < width; wofs++) set(g, c, y0 + wofs, ch);
  }
  const dirY = y1 >= y0 ? 1 : -1;
  for (let r = y0; r !== y1 + dirY; r += dirY) {
    for (let wofs = 0; wofs < width; wofs++) set(g, x1 + wofs, r, ch);
  }
}

// Deterministic scatter: places `ch` on cells currently equal to `on`.
export function scatter(g, x, y, w, h, ch, density, seed, on = 'g') {
  let s = seed;
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  for (let r = y; r < y + h; r++) {
    for (let c = x; c < x + w; c++) {
      if (get(g, c, r) === on && rand() < density) set(g, c, r, ch);
    }
  }
}

// A path that WANDERS between waypoints instead of drawing straight L-legs:
// each step moves toward the next point but drifts sideways ~30% of the time,
// occasionally widening — organic trails instead of ruler lines.
export function wigglyPath(g, points, ch = 'd', seed = 1) {
  let s = seed;
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  for (let p = 0; p < points.length - 1; p++) {
    let [x, y] = points[p];
    const [tx, ty] = points[p + 1];
    set(g, x, y, ch);
    let guard = 0;
    while ((x !== tx || y !== ty) && guard++ < 500) {
      const dx = Math.sign(tx - x);
      const dy = Math.sign(ty - y);
      const r = rand();
      if (r < 0.32 && dx !== 0 && dy !== 0) {
        // drift on the secondary axis
        if (Math.abs(tx - x) > Math.abs(ty - y)) y += dy; else x += dx;
      } else if (r < 0.44 && (dx === 0 || dy === 0)) {
        // wander off-axis briefly even on straight stretches
        if (dx === 0) x += rand() < 0.5 ? 1 : -1;
        else y += rand() < 0.5 ? 1 : -1;
      } else if (Math.abs(tx - x) >= Math.abs(ty - y) && dx !== 0) {
        x += dx;
      } else if (dy !== 0) {
        y += dy;
      } else if (dx !== 0) {
        x += dx;
      }
      set(g, x, y, ch);
      if (rand() < 0.3) set(g, x + (rand() < 0.5 ? 1 : -1), y, ch); // widen
    }
  }
}

// A meandering horizontal boundary: returns rowFor(x), a gentle random walk
// around baseRow clamped to ±amp, PINNED to baseRow near any x in pinCols so
// ramps/gates land on a predictable row.
export function meanderRow(baseRow, x0, x1, amp, seed, pinCols = []) {
  let s = seed;
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  const rows = {};
  let cur = baseRow;
  for (let x = x0; x <= x1; x++) {
    const pinned = pinCols.some((p) => Math.abs(x - p) <= 1);
    if (pinned) cur = baseRow;
    else if (rand() < 0.35) {
      cur += rand() < 0.5 ? -1 : 1;
      cur = Math.max(baseRow - amp, Math.min(baseRow + amp, cur));
    }
    rows[x] = cur;
  }
  return (x) => rows[x] ?? baseRow;
}

export function toStrings(g) {
  return g.map((row) => row.join(''));
}
