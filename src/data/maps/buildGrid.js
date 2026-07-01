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

export function toStrings(g) {
  return g.map((row) => row.join(''));
}
