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
// A proper little hamlet: a cobbled square with a well, four homes, a forge,
// market stalls and garden plots, ringed loosely so it reads as a place people
// live. Cleared to grass first, then dressed.
fillRect(g, 14, 21, 20, 11, 'g'); // clear a generous village footprint
fillRect(g, 19, 25, 10, 5, 'd');  // cobbled square
fillRect(g, 23, 21, 2, 11, 'd');  // north-south high street
fillRect(g, 15, 27, 18, 1, 'd');  // east-west lane

// Maren's house (elder, NW — walk-in, wood floor, hearth)
fillRect(g, 15, 21, 6, 5, '#');
fillRect(g, 16, 22, 4, 3, '_');
set(g, 18, 25, 'd');   // doorway
set(g, 16, 22, 'B');   // bed
set(g, 19, 22, 's');   // shelf
set(g, 16, 24, 'h');   // chair
set(g, 17, 22, 't');   // table
set(g, 19, 24, 'k');   // keg

// Saltbeard's cottage (fisher, SW)
fillRect(g, 15, 29, 5, 3, '#');
fillRect(g, 16, 30, 3, 1, '_');
set(g, 17, 31, 'd');   // doorway
set(g, 16, 30, 'B');

// Brena's forge (smith, E — open-sided)
fillRect(g, 30, 22, 4, 3, '#');
set(g, 31, 24, 'd');   // opening
set(g, 30, 23, 'x');   // crates
set(g, 33, 23, 'b');   // barrel of quench-water
set(g, 32, 22, 's');   // tool shelf

// Storehouse (SE)
fillRect(g, 30, 29, 4, 3, '#');
set(g, 31, 29, 'd');
set(g, 32, 30, 'x');
set(g, 33, 30, 'b');

// village well at the heart of the square
set(g, 23, 26, 'p');   // stone well-ring (column stands in for it)

// market stalls + garden plots + fences
set(g, 20, 29, 'o'); set(g, 21, 29, 'o');  // fruit barrels
set(g, 26, 29, 'b'); set(g, 27, 30, 'o');  // trader's stall
set(g, 25, 22, 'o'); set(g, 26, 22, 'q');  // north stall
scatter(g, 15, 22, 4, 4, ',', 0.25, 201);  // Maren's herb garden
scatter(g, 30, 25, 4, 4, ',', 0.2, 202);   // kitchen garden
scatter(g, 14, 21, 20, 11, ',', 0.06, 131);

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
    { type: 'player_spawn', id: 'from_cove', x: 23, y: 31, dir: Math.PI }, // arrive from the prologue beach
    { type: 'player_spawn', id: 'd1_exit', x: 23, y: 6, dir: 0 },
    { type: 'player_spawn', id: 'd2_exit', x: 38, y: 15, dir: 0 },
    { type: 'player_spawn', id: 'd3_exit', x: 5, y: 12, dir: Math.PI / 2 },
    // dungeon doorways
    { type: 'warp', x: 23, y: 5, to: { map: 'dungeon1', spawn: 'entrance' } },
    { type: 'warp', x: 38, y: 13, to: { map: 'dungeon2', spawn: 'entrance' } },
    { type: 'warp', x: 4, y: 12, to: { map: 'dungeon3', spawn: 'entrance' } },
    { type: 'eye_switch', id: 'ow_eye_d2', x: 40, y: 14, dir: 's', sets: 'd2_gate_open' },
    { type: 'cracked_wall', id: 'd3_crack', x: 7, y: 12, dir: 'e' },
    // village folk (see new layout above)
    { type: 'npc', id: 'maren', x: 18, y: 26, model: 'mage', dialogId: 'elder_maren', dir: 's' },
    { type: 'npc', id: 'saltbeard', x: 17, y: 32, model: 'rogue', dialogId: 'saltbeard', dir: 'n' },
    { type: 'npc', id: 'brena', x: 31, y: 25, model: 'barbarian', dialogId: 'brena', dir: 's' },
    { type: 'npc', id: 'pip', x: 25, y: 28, model: 'rogue', scale: 0.38, dialogId: 'village_kid', dir: 'w' },
    { type: 'npc', id: 'tam', x: 21, y: 30, model: 'barbarian', scale: 0.5, dialogId: 'villager_tam', dir: 'e' },
    { type: 'sign', id: 'sign_village', x: 22, y: 32, dir: 's', dialogId: 'sign_village' },
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
