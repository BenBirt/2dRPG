import { makeGrid, set, fillRect, outlineRect, path, scatter, toStrings } from './buildGrid.js';

// Playable prologue: the knight wakes on a storm-wrecked beach and climbs a
// REAL switchback — two cliff terraces with ramps at alternating ends — up to
// the pass where Maren waits. A stream falls terrace to terrace beside the
// path. No combat; it grounds "how we got here" and teaches movement.
//
// Vertical structure (heights grid):
//   rows 20-25  level 0  — beach & lower meadow (sea below)
//   row  19     cliff    — ramp up at col 21 (east end)
//   rows 12-18  level 1  — mid terrace, walk west
//   row  11     cliff    — ramp up at col 7 (west end)
//   rows  1-10  level 2  — upper terrace, walk east to the pass at (15,1)
const W = 30;
const H = 34;
const g = makeGrid(W, H, 'g');
const hg = makeGrid(W, H, '0');

outlineRect(g, 0, 0, W, H, 'C');
fillRect(g, 1, 26, W - 2, 8, '~');        // the sea
fillRect(g, 8, 23, 14, 3, 'd');            // wet-sand beach where you wash up

// terrace levels
fillRect(hg, 1, 1, W - 2, 10, '2');        // rows 1-10  -> level 2
fillRect(hg, 1, 11, W - 2, 8, '1');        // rows 11-18 -> level 1 (incl. cliff row)
// (rows 19+ stay level 0; the ramp rows carry the lower level)
fillRect(hg, 1, 19, W - 2, 1, '0');
fillRect(hg, 1, 11, W - 2, 1, '1');

// cliff faces between terraces, with ramp gaps at alternating ends
for (let x = 1; x < W - 1; x++) set(g, x, 19, 'C'); // level 0 -> 1 face
set(g, 21, 19, 'd');                                 // east ramp gap
for (let x = 1; x < W - 1; x++) set(g, x, 11, 'C'); // level 1 -> 2 face
set(g, 7, 11, 'd');                                  // west ramp gap
// ramp cells sit at the LOWER level; Heightfield interpolates up them
set(hg, 21, 19, '0');
set(hg, 7, 11, '1');

// the path itself: beach -> east ramp -> west along terrace 1 -> west ramp ->
// east along terrace 2 -> the pass
path(g, 15, 23, 21, 23, 'd');
path(g, 21, 23, 21, 20, 'd');
path(g, 21, 18, 21, 15, 'd');
path(g, 21, 15, 7, 15, 'd');
path(g, 7, 15, 7, 12, 'd');
path(g, 7, 10, 7, 6, 'd');
path(g, 7, 6, 15, 6, 'd');
path(g, 15, 6, 15, 1, 'd');
set(g, 15, 1, 'd'); // the pass out (north edge)

// a stream that falls terrace to terrace east of the path, into the sea
fillRect(g, 25, 1, 2, 10, '~');   // upper stream
fillRect(g, 25, 12, 2, 7, '~');   // mid stream
fillRect(g, 25, 20, 2, 6, '~');   // lower pool joining the sea
set(hg, 25, 11, '1'); set(hg, 26, 11, '1');

// woods & dressing (kept off the path and stream)
scatter(g, 2, 2, 22, 8, 'T', 0.18, 41);
scatter(g, 2, 12, 22, 6, 'T', 0.14, 43);
scatter(g, 2, 2, 22, 16, 'R', 0.03, 17);
scatter(g, 2, 4, 22, 18, ',', 0.1, 63);
scatter(g, 4, 20, 18, 3, 'R', 0.06, 5);   // shore rocks above the beach

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
    { x: 25, y: 11, dir: 's', to: 1 }, // upper stream over the mid cliff
    { x: 25, y: 19, dir: 's', to: 0 }, // mid stream down to the sea pool
  ],
  entities: [
    { type: 'player_spawn', id: 'wake', x: 15, y: 24, dir: Math.PI }, // face inland
    // wreckage + waymarks, placed BESIDE the path on sand/grass
    { type: 'sign', id: 'intro_hull', x: 12, y: 24, dir: 'e', dialogId: 'intro_hull' },
    { type: 'sign', id: 'intro_path', x: 20, y: 21, dir: 'w', dialogId: 'intro_path' },
    { type: 'npc', id: 'maren_intro', x: 14, y: 3, model: 'mage', dialogId: 'maren_intro', dir: 's' },
    // stepping through the pass warps into the isle proper
    { type: 'warp', x: 15, y: 1, to: { map: 'overworld', spawn: 'from_cove' } },
  ],
};
