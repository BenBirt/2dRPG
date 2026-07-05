// Grid legend: every character that may appear in a map's `grid` strings.
//
//   floor      model name for the ground piece ('grass'/'dirt'/'water' are
//              procedural surfaces, see MapLoader)
//   solid      blocks movement
//   wallStyle  solid cells: 'dressed' places KayKit wall faces toward open
//              neighbours (dungeons); 'cliff' is a plain colored block
//              (overworld); 'tree'/'rock' are procedural props on grass
//   prop       optional static model placed on the floor
//   cuttable   sword destroys it (spawns from the matching drop table)
//
// Stateful objects (doors, chests, switches, NPCs, spawns, warps) are NOT
// grid chars — they live in each map's `doors`/`entities` arrays with ids.
export const LEGEND = {
  '.': { floor: 'stone' },               // dungeon stone floor (variants auto-mixed)
  '_': { floor: 'wood' },                // interior wood floor
  'g': { floor: 'grass' },               // overworld grass
  'd': { floor: 'dirt' },                // dirt path
  '#': { floor: 'stone', solid: true, wallStyle: 'dressed' },
  'C': { floor: 'stone', solid: true, wallStyle: 'cliff' },
  'T': { floor: 'grass', solid: true, wallStyle: 'tree' },
  'R': { floor: 'grass', solid: true, wallStyle: 'rock' },
  'f': { floor: 'grass', solid: true, wallStyle: 'fence' },   // picket fence
  'w': { floor: 'grass', solid: true, wallStyle: 'well' },    // village well
  '~': { floor: 'water', solid: true },
  ',': { floor: 'grass', cuttable: 'grass' },         // tall grass tuft
  'o': { floor: 'stone', prop: 'barrel_small', cuttable: 'pot' },
  'b': { floor: 'stone', prop: 'barrel_large', propSolid: true },
  'x': { floor: 'stone', prop: 'crates_stacked', propSolid: true },
  'P': { floor: 'stone', prop: 'pillar', propSolid: true },
  'p': { floor: 'stone', prop: 'column', propSolid: true },
  '*': { floor: 'stone', prop: 'torch_lit' },          // freestanding torch, walkable cell edge deco
  'r': { floor: 'stone', prop: 'rubble_half' },
  'u': { floor: 'grass', prop: 'rubble_large', propSolid: true },
  't': { floor: 'wood', prop: 'table_medium', propSolid: true },
  'h': { floor: 'wood', prop: 'chair' },
  's': { floor: 'wood', prop: 'shelf_small', propSolid: true },
  'B': { floor: 'wood', prop: 'bed_decorated', propSolid: true },
  'k': { floor: 'wood', prop: 'keg', propSolid: true },
  'q': { floor: 'stone', prop: 'box_small', cuttable: 'pot' },
};

// Floor surface variant pools, picked per-cell with a deterministic hash so
// maps look varied but identical on every load.
export const FLOOR_VARIANTS = {
  stone: [
    [0.62, 'floor_tile_small'],
    [0.1, 'floor_tile_small_broken_A'],
    [0.08, 'floor_tile_small_broken_B'],
    [0.08, 'floor_tile_small_decorated'],
    [0.06, 'floor_tile_small_weeds_A'],
    [0.06, 'floor_tile_small_weeds_B'],
  ],
  dirtPatch: [
    [0.5, 'floor_dirt_small_A'],
    [0.5, 'floor_dirt_small_B'],
  ],
};
