import {
  makeGrid, set, fillRect, outlineRect, scatter, toStrings, wigglyPath, meanderRow,
} from './buildGrid.js';

// Playable prologue: the knight wakes beside the broken ribs of their ship on
// a sandy cove and climbs a real switchback — two cliff terraces with ramps at
// alternating ends — up to the pass where Maren waits. Everything here is
// deliberately IRREGULAR: the coastline, the cliff lines, and the paths all
// meander. No signs; the wreck tells the story.
const W = 30;
const H = 34;
const g = makeGrid(W, H, 'g');
const hg = makeGrid(W, H, '0');

outlineRect(g, 0, 0, W, H, 'C');

// --- meandering terrace cliff lines (pinned flat around the ramp columns) ---
const cliff1 = meanderRow(19, 1, W - 2, 1, 77, [21]); // level 0 -> 1
const cliff2 = meanderRow(11, 1, W - 2, 1, 78, [7]);  // level 1 -> 2

// heights per column follow the meanders
for (let x = 1; x < W - 1; x++) {
  for (let y = 1; y < H - 1; y++) {
    if (y < cliff2(x)) set(hg, x, y, '2');
    else if (y <= cliff1(x)) set(hg, x, y, '1');
    // else stays 0
  }
  set(hg, x, cliff1(x), '0'); // cliff cells carry the lower level
}
for (let x = 1; x < W - 1; x++) {
  set(g, x, cliff1(x), 'C');
  set(g, x, cliff2(x), 'C');
}
set(g, 21, cliff1(21), 'd'); // east ramp gap (row 19 — pinned)
set(g, 7, cliff2(7), 'd');   // west ramp gap (row 11 — pinned)

// --- wavy coastline: sea creeps in and out; sand band above it -------------
const seaEdge = meanderRow(26, 1, W - 2, 2, 79, [15]);
for (let x = 1; x < W - 1; x++) {
  for (let y = seaEdge(x); y < H - 1; y++) set(g, x, y, '~');
  // the sand band runs from a couple rows above the waterline down to it
  for (let y = Math.max(cliff1(x) + 1, seaEdge(x) - 4); y < seaEdge(x); y++) {
    set(g, x, y, 'a');
  }
}

// --- the climbing path, wandering rather than ruled ------------------------
wigglyPath(g, [[16, 23], [21, 21]], 'd', 11);            // beach -> east ramp
set(g, 21, 20, 'd'); set(g, 21, 19, 'd'); set(g, 21, 18, 'd');
wigglyPath(g, [[21, 17], [14, 15], [7, 13]], 'd', 12);    // terrace 1, heading west
set(g, 7, 12, 'd'); set(g, 7, 11, 'd'); set(g, 7, 10, 'd');
wigglyPath(g, [[7, 9], [12, 7], [15, 4]], 'd', 13);       // terrace 2, up to the pass
wigglyPath(g, [[15, 4], [15, 1]], 'd', 14);
set(g, 15, 1, 'd'); // the pass out (north edge)

// re-assert the cliff lines (wandering paths may have nicked them); only the
// pinned ramp columns stay open
for (let x = 1; x < W - 1; x++) {
  if (x !== 21) set(g, x, cliff1(x), 'C');
  if (x !== 7) set(g, x, cliff2(x), 'C');
}

// --- the stream: bends across both terraces, falling at each cliff ---------
fillRect(g, 25, 1, 2, 4, '~');
fillRect(g, 24, 5, 2, 4, '~');
fillRect(g, 25, 9, 2, 2, '~');   // approaches the upper cliff at col 25
fillRect(g, 25, 12, 2, 4, '~');
fillRect(g, 26, 16, 2, 3, '~');  // wanders east, meets the lower cliff ~col 26
// plunge pools continue into the sea naturally via the coast

// --- woods & dressing (scatter only replaces grass, so cliffs/path survive) -
scatter(g, 2, 2, 26, 8, 'T', 0.2, 41);
scatter(g, 2, 12, 26, 6, 'T', 0.15, 43);
scatter(g, 2, 2, 26, 16, 'R', 0.03, 17);
scatter(g, 2, 4, 26, 15, ',', 0.1, 63);
scatter(g, 3, 20, 24, 2, 'R', 0.05, 5); // rocks where grass meets sand

export default {
  id: 'intro',
  music: 'title',
  grid: toStrings(g),
  heights: toStrings(hg),
  ramps: [
    { x: 21, y: 19, dir: 'n' }, // beach -> mid terrace
    { x: 7, y: 11, dir: 'n' },  // mid -> upper terrace
  ],
  waterfalls: [
    { x: 25, y: 11, dir: 's', to: 1 }, // stream over the upper cliff
    { x: 26, y: 19, dir: 's', to: 0 }, // and again down to the shore
  ],
  entities: [
    { type: 'player_spawn', id: 'wake', x: 16, y: 24, dir: Math.PI }, // face inland
    // the knight's ship — broken ribs in the sand right beside where you wake
    { type: 'wreck', id: 'intro_wreck', x: 13, y: 24, dir: 'e', angle: 0.55 },
    { type: 'npc', id: 'maren_intro', x: 14, y: 3, model: 'mage', dialogId: 'maren_intro', dir: 's' },
    // stepping through the pass warps into the isle proper
    { type: 'warp', x: 15, y: 1, to: { map: 'overworld', spawn: 'from_cove' } },
  ],
};
