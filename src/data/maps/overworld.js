import { makeGrid, set, fillRect, outlineRect, path, scatter, toStrings } from './buildGrid.js';

// The isle of Vessa. South: landing beach and the sea. Center: Brookhollow
// village. North: woods and the Bramble Crypt (D1). East: lake and the
// Drowned Cellars gate (D2, eye-switch). West: the Sanctum (D3, bombable).
const W = 46;
const H = 38;
const g = makeGrid(W, H, 'g');

// --- coastline & cliffs ---------------------------------------------------
outlineRect(g, 0, 0, W, H, 'C');
fillRect(g, 1, 1, W - 2, 1, 'C'); // thick north cliff
fillRect(g, 0, 34, W, 4, '~'); // the sea
fillRect(g, 14, 32, 20, 2, 'd'); // landing beach
fillRect(g, 1, 2, 2, 32, 'C'); // west cliff band
fillRect(g, 43, 2, 2, 32, 'C'); // east cliff band

// --- the lake (blocks the direct route east) -------------------------------
fillRect(g, 31, 9, 9, 8, '~');
scatter(g, 29, 8, 13, 11, ',', 0.35, 71); // marsh grass fringe

// --- woods ------------------------------------------------------------------
scatter(g, 4, 3, 38, 6, 'T', 0.34, 11);
scatter(g, 4, 9, 9, 14, 'T', 0.3, 23);
scatter(g, 12, 9, 8, 8, 'T', 0.16, 37);
scatter(g, 4, 3, 38, 28, 'R', 0.02, 53);
scatter(g, 5, 10, 36, 20, ',', 0.08, 91);

// --- paths -------------------------------------------------------------------
path(g, 23, 32, 23, 27, 'd'); // beach -> village
path(g, 23, 27, 23, 7, 'd'); // village -> crypt (north)
path(g, 23, 27, 38, 27, 'd'); // village -> east shore
path(g, 38, 27, 38, 16, 'd'); // east shore -> cellars gate
path(g, 23, 27, 10, 27, 'd'); // village -> west
path(g, 10, 27, 10, 13, 'd'); // west -> sanctum approach
path(g, 10, 13, 8, 13, 'd');

// --- Brookhollow village -----------------------------------------------------
fillRect(g, 17, 23, 14, 8, 'g'); // clear the square
fillRect(g, 20, 25, 8, 5, 'd'); // village square
// Maren's house (walk-in, wood floor)
fillRect(g, 17, 22, 6, 5, '#');
fillRect(g, 18, 23, 4, 3, '_');
set(g, 20, 26, '_'); // doorway gap in the south wall
set(g, 18, 23, 'B'); // bed
set(g, 21, 23, 's'); // shelf
set(g, 18, 25, 'h'); // chair
set(g, 19, 23, 't'); // table
// Brena's forge (open-air)
fillRect(g, 28, 23, 3, 2, '#');
set(g, 28, 25, 'x');
set(g, 30, 25, 'b');
// market clutter
set(g, 26, 30, 'b');
set(g, 19, 29, 'o');
set(g, 20, 29, 'o');
scatter(g, 17, 22, 14, 9, ',', 0.05, 131);

// --- Bramble Crypt facade (D1, north) ---------------------------------------
fillRect(g, 20, 3, 7, 3, 'C');
fillRect(g, 23, 5, 1, 1, 'd'); // entrance recess
set(g, 22, 5, 'C');
set(g, 24, 5, 'C');
path(g, 23, 6, 23, 7, 'd');

// --- Drowned Cellars gate (D2, east) -----------------------------------------
fillRect(g, 36, 12, 8, 3, 'C');
set(g, 38, 14, 'd'); // gate doorway (Door entity blocks until flag)
set(g, 40, 14, 'd'); // eye alcove (eye_switch floats here)
set(g, 40, 13, 'C');
fillRect(g, 37, 15, 3, 1, 'd');
fillRect(g, 37, 13, 3, 1, 'd'); // behind the gate
set(g, 38, 13, 'd');

// --- Sanctum approach (D3, west) ----------------------------------------------
fillRect(g, 3, 10, 5, 6, 'C');
fillRect(g, 4, 12, 4, 1, 'd'); // carved passage, crack blocks at x=7

// --- northern highland: the wooded rise the Bramble Crypt sits on ------------
// Rows 1-8 climb to elevation level 1; a cliff south-face at row 9 walls it
// off, with a ramp gap where the crypt path (col 23) crosses. The highland's
// eastern edge drops to the lake as a cliff with a waterfall.
const hg = makeGrid(W, H, '0'); // parallel heights grid
fillRect(hg, 1, 1, W - 2, 8, '1'); // rows 1-8 → level 1
// south face cliff along row 9 (skip the lake cols 31-39 and the ramp col 23)
for (let x = 3; x <= 42; x++) {
  if (x === 23) continue;            // ramp gap
  if (x >= 31 && x <= 39) continue;  // lake
  set(g, x, 9, 'C');
}
// eastern cliff face down to the lake (row 8, over the lake columns), with a
// gap at col 35 for the waterfall
for (let x = 31; x <= 39; x++) {
  if (x === 35) continue;
  set(g, x, 8, 'C');
}
set(g, 23, 9, 'd'); // ramp cell stays a walkable path

export default {
  id: 'overworld',
  music: 'overworld',
  grid: toStrings(g),
  heights: toStrings(hg),
  ramps: [
    { x: 23, y: 9, dir: 'n' }, // climb north from the village up to the crypt
  ],
  waterfalls: [
    { x: 35, y: 8, dir: 's', to: 0 }, // highland edge → into the lake
  ],
  doors: [
    { id: 'ow_gate_d2', x: 38, y: 14, dir: 's', type: 'shut', openWhen: 'flag:d2_gate_open' },
  ],
  entities: [
    // spawns
    { type: 'player_spawn', id: 'start', x: 23, y: 31, dir: Math.PI },
    { type: 'player_spawn', id: 'd1_exit', x: 23, y: 6, dir: 0 },
    { type: 'player_spawn', id: 'd2_exit', x: 38, y: 15, dir: 0 },
    { type: 'player_spawn', id: 'd3_exit', x: 5, y: 12, dir: Math.PI / 2 },
    // dungeon doorways
    { type: 'warp', x: 23, y: 5, to: { map: 'dungeon1', spawn: 'entrance' } },
    { type: 'warp', x: 38, y: 13, to: { map: 'dungeon2', spawn: 'entrance' } },
    { type: 'warp', x: 4, y: 12, to: { map: 'dungeon3', spawn: 'entrance' } },
    { type: 'eye_switch', id: 'ow_eye_d2', x: 40, y: 14, dir: 's', sets: 'd2_gate_open' },
    { type: 'cracked_wall', id: 'd3_crack', x: 7, y: 12, dir: 'e' },
    // village
    { type: 'npc', id: 'maren', x: 20, y: 24, model: 'mage', dialogId: 'elder_maren', dir: 's' },
    { type: 'npc', id: 'saltbeard', x: 26, y: 31, model: 'rogue', dialogId: 'saltbeard', dir: 's' },
    { type: 'npc', id: 'brena', x: 29, y: 26, model: 'barbarian', dialogId: 'brena', dir: 's' },
    { type: 'npc', id: 'pip', x: 24, y: 28, model: 'rogue', scale: 0.38, dialogId: 'village_kid', dir: 'w' },
    { type: 'sign', id: 'sign_village', x: 22, y: 30, dir: 's', dialogId: 'sign_village' },
    { type: 'sign', id: 'sign_crypt', x: 21, y: 6, dir: 's', dialogId: 'sign_crypt' },
    { type: 'sign', id: 'sign_cellars', x: 36, y: 17, dir: 's', dialogId: 'sign_cellars' },
    { type: 'sign', id: 'sign_sanctum', x: 8, y: 14, dir: 's', dialogId: 'sign_sanctum' },
    // wandering dead
    { type: 'skeleton', x: 23, y: 12 },
    { type: 'skeleton', x: 17, y: 4 },  // up on the highland near the crypt
    { type: 'skeleton', x: 30, y: 20 },
    { type: 'skeleton_archer', x: 36, y: 22 },
    { type: 'skeleton', x: 10, y: 18 },
  ],
};
