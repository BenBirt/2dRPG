/**
 * validate-maps.mjs
 * Run: node tools/validate-maps.mjs [--self-test]
 *
 * Validates all maps in src/data/maps/index.js against the rules described
 * in the game's map format spec. Collects ALL failures, prints each as
 * "mapId: message", exits 1 if any; prints "OK (N maps validated)" and
 * exits 0 otherwise.
 *
 * --self-test: also runs two inline fixture maps (one valid, one broken) and
 * asserts the broken one yields specific expected errors.
 */

import { LEGEND } from '../src/data/tiles.js';
import { MAPS } from '../src/data/maps/index.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SELF_TEST = process.argv.includes('--self-test');

// Entity types that require a walkable (non-solid) cell
const WALKABLE_TYPES = new Set([
  'player_spawn', 'npc', 'skeleton', 'skeleton_archer', 'skeleton_mage',
  'boss1', 'boss2', 'boss3', 'pickup', 'chest', 'warp', 'sign', 'lectern',
]);

// Entity types whose id field is REQUIRED
const ID_REQUIRED_TYPES = new Set([
  'player_spawn', 'chest', 'npc', 'switch', 'eye_switch', 'cracked_wall',
  'sign', 'lectern',
]);

// Enemy types
const ENEMY_TYPES = new Set([
  'skeleton', 'skeleton_archer', 'skeleton_mage', 'boss1', 'boss2', 'boss3',
]);

const VALID_DOOR_DIRS = new Set(['n', 's', 'e', 'w']);
const VALID_DOOR_TYPES = new Set(['locked', 'boss', 'shut', 'oneway']);
const VALID_OPEN_WHEN_ROOM_CLEAR = 'room_clear';

// ---------------------------------------------------------------------------
// Core validator
// ---------------------------------------------------------------------------

/**
 * Validate a single map object. Returns an array of error strings (empty = OK).
 * allMaps is the full { id -> mapDef } map used for cross-map warp checks.
 * knownSets is a Set of all flag names set anywhere across all maps (pre-built).
 * allEntityIds is a Set of all entity ids across all maps (pre-built).
 * allDoorIds is a Set of all door ids across all maps (pre-built).
 */
function validateMap(map, allMaps, knownSets, allEntityIds, allDoorIds) {
  const errors = [];
  const id = map.id ?? '<unknown>';

  function err(msg) {
    errors.push(`${id}: ${msg}`);
  }

  // -------------------------------------------------------------------------
  // Check 1: grid exists, non-empty, all rows same length, all chars in LEGEND
  // -------------------------------------------------------------------------
  if (!Array.isArray(map.grid) || map.grid.length === 0) {
    err('grid must be a non-empty array of strings');
    // Cannot proceed with grid checks without a valid grid
    return errors;
  }

  const rowLen = map.grid[0].length;
  if (rowLen === 0) {
    err('grid rows must not be empty strings');
    return errors;
  }

  map.grid.forEach((row, ri) => {
    if (typeof row !== 'string') {
      err(`grid row ${ri} is not a string`);
      return;
    }
    if (row.length !== rowLen) {
      err(`grid row ${ri} length ${row.length} != expected ${rowLen}`);
    }
    for (let ci = 0; ci < row.length; ci++) {
      const ch = row[ci];
      if (!(ch in LEGEND)) {
        err(`grid row ${ri} col ${ci}: unknown char '${ch}'`);
      }
    }
  });

  const gridH = map.grid.length;
  const gridW = rowLen;

  function inBounds(x, y) {
    return Number.isInteger(x) && Number.isInteger(y) &&
           x >= 0 && x < gridW && y >= 0 && y < gridH;
  }

  function cellDef(x, y) {
    if (!inBounds(x, y)) return null;
    const ch = map.grid[y][x];
    return LEGEND[ch] ?? null;
  }

  function isSolid(x, y) {
    const def = cellDef(x, y);
    return def ? (def.solid === true || def.propSolid === true) : true;
  }

  // -------------------------------------------------------------------------
  // Check 2: id uniqueness within map
  // -------------------------------------------------------------------------
  const seenIds = new Set();

  function checkId(idVal, context) {
    if (idVal == null) return; // optional ids handled elsewhere
    if (seenIds.has(idVal)) {
      err(`duplicate id '${idVal}' (${context})`);
    } else {
      seenIds.add(idVal);
    }
  }

  // Door ids are required
  const doors = Array.isArray(map.doors) ? map.doors : [];
  doors.forEach((door, di) => {
    if (door.id == null) {
      err(`door[${di}] missing required id`);
    } else {
      checkId(door.id, `door[${di}]`);
    }
  });

  // Room ids are required
  const rooms = Array.isArray(map.rooms) ? map.rooms : [];
  const roomIds = new Set();
  rooms.forEach((room, ri) => {
    if (room.id == null) {
      err(`room[${ri}] missing required id`);
    } else {
      if (roomIds.has(room.id)) {
        err(`duplicate room id '${room.id}'`);
      } else {
        roomIds.add(room.id);
      }
      checkId(room.id, `room[${ri}]`);
    }
  });

  // Entity ids: required for some types, optional for others
  const entities = Array.isArray(map.entities) ? map.entities : [];
  entities.forEach((ent, ei) => {
    if (ID_REQUIRED_TYPES.has(ent.type)) {
      if (ent.id == null) {
        err(`entity[${ei}] type '${ent.type}' missing required id`);
      } else {
        checkId(ent.id, `entity[${ei}] type '${ent.type}'`);
      }
    } else if (ent.id != null) {
      // Optional id present — still must be unique
      checkId(ent.id, `entity[${ei}] type '${ent.type}'`);
    }
  });

  // -------------------------------------------------------------------------
  // Check 3: entity and door x,y within grid bounds
  // -------------------------------------------------------------------------
  entities.forEach((ent, ei) => {
    if (!inBounds(ent.x, ent.y)) {
      err(`entity[${ei}] type '${ent.type}' id '${ent.id ?? ''}' position (${ent.x},${ent.y}) out of bounds (gridW=${gridW},gridH=${gridH})`);
    }
  });

  doors.forEach((door, di) => {
    if (!inBounds(door.x, door.y)) {
      err(`door[${di}] id '${door.id ?? ''}' position (${door.x},${door.y}) out of bounds`);
    }
  });

  // -------------------------------------------------------------------------
  // Check 4: walkable/solid placement rules
  // -------------------------------------------------------------------------
  entities.forEach((ent, ei) => {
    if (!inBounds(ent.x, ent.y)) return; // already reported

    const def = cellDef(ent.x, ent.y);

    if (ent.type === 'cracked_wall') {
      // Must sit on a solid cell with wallStyle 'dressed' or 'cliff'
      if (!def || !def.solid) {
        err(`entity[${ei}] cracked_wall '${ent.id ?? ''}' at (${ent.x},${ent.y}) must be on a solid cell`);
      } else if (def.wallStyle !== 'dressed' && def.wallStyle !== 'cliff') {
        err(`entity[${ei}] cracked_wall '${ent.id ?? ''}' at (${ent.x},${ent.y}) must be on a cell with wallStyle 'dressed' or 'cliff' (got '${def.wallStyle}')`);
      }
    } else if (WALKABLE_TYPES.has(ent.type)) {
      // Must NOT be solid
      if (def && (def.solid || def.propSolid)) {
        err(`entity[${ei}] type '${ent.type}' id '${ent.id ?? ''}' at (${ent.x},${ent.y}) is placed on a solid cell`);
      }
      // Extra: chest on cuttable cell is an error
      if (ent.type === 'chest' && def && def.cuttable) {
        err(`entity[${ei}] chest '${ent.id ?? ''}' at (${ent.x},${ent.y}) sits on a cuttable cell`);
      }
    }
  });

  // Doors: must sit on a NON-solid cell (door blocks it dynamically)
  doors.forEach((door, di) => {
    if (!inBounds(door.x, door.y)) return;
    if (isSolid(door.x, door.y)) {
      err(`door[${di}] id '${door.id ?? ''}' at (${door.x},${door.y}) must be on a non-solid (walkable) cell`);
    }
    // Validate dir
    if (!VALID_DOOR_DIRS.has(door.dir)) {
      err(`door[${di}] id '${door.id ?? ''}' has invalid dir '${door.dir}' (must be n|s|e|w)`);
    }
    // Validate type
    if (door.type != null && !VALID_DOOR_TYPES.has(door.type)) {
      err(`door[${di}] id '${door.id ?? ''}' has invalid type '${door.type}'`);
    }
  });

  // -------------------------------------------------------------------------
  // Check 5: every map has at least one player_spawn
  // -------------------------------------------------------------------------
  const spawns = entities.filter(e => e.type === 'player_spawn');
  if (spawns.length === 0) {
    err('map has no player_spawn entity');
  }

  // -------------------------------------------------------------------------
  // Check 6: warp.to.map exists in MAPS and target has matching spawn id
  // -------------------------------------------------------------------------
  entities.filter(e => e.type === 'warp').forEach((warp, wi) => {
    const toMap = warp.to?.map;
    const toSpawn = warp.to?.spawn;
    if (!toMap) {
      err(`warp entity at (${warp.x},${warp.y}) missing to.map`);
      return;
    }
    if (!toSpawn) {
      err(`warp entity at (${warp.x},${warp.y}) missing to.spawn`);
      return;
    }
    if (!(toMap in allMaps)) {
      err(`warp entity at (${warp.x},${warp.y}) references unknown map '${toMap}'`);
      return;
    }
    const targetMap = allMaps[toMap];
    const targetEntities = Array.isArray(targetMap.entities) ? targetMap.entities : [];
    const found = targetEntities.some(e => e.type === 'player_spawn' && e.id === toSpawn);
    if (!found) {
      err(`warp entity at (${warp.x},${warp.y}) to map '${toMap}' spawn '${toSpawn}' not found in target map`);
    }
  });

  // -------------------------------------------------------------------------
  // Check 7: rooms and openWhen flags
  // -------------------------------------------------------------------------
  rooms.forEach((room, ri) => {
    // w > 0, h > 0
    if (!(room.w > 0)) {
      err(`room '${room.id ?? ri}' has non-positive width ${room.w}`);
    }
    if (!(room.h > 0)) {
      err(`room '${room.id ?? ri}' has non-positive height ${room.h}`);
    }
    // rect within bounds
    if (room.x < 0 || room.y < 0 ||
        room.x + room.w > gridW || room.y + room.h > gridH) {
      err(`room '${room.id ?? ri}' rect (x=${room.x},y=${room.y},w=${room.w},h=${room.h}) out of grid bounds (${gridW}x${gridH})`);
    }
  });

  doors.forEach((door, di) => {
    const openWhen = door.openWhen;
    if (!openWhen) return;
    if (openWhen === VALID_OPEN_WHEN_ROOM_CLEAR) return;

    if (openWhen.startsWith('flag:')) {
      const flagName = openWhen.slice(5);
      // Accept if: appears in any map's entity `sets`, OR matches /_boss_dead$/,
      // OR equals any entity id (across all maps), OR equals any door id.
      const ok = knownSets.has(flagName) ||
                 /_boss_dead$/.test(flagName) ||
                 allEntityIds.has(flagName) ||
                 allDoorIds.has(flagName);
      if (!ok) {
        err(`door '${door.id ?? di}' openWhen flag '${flagName}' is never set by any entity, is not a known entity/door id, and doesn't match /_boss_dead$/`);
      }
    } else {
      err(`door '${door.id ?? di}' has unrecognized openWhen value '${openWhen}' (expected 'room_clear' or 'flag:<name>')`);
    }
  });

  // -------------------------------------------------------------------------
  // Check 8: dungeon key economy (maps with rooms)
  // -------------------------------------------------------------------------
  if (rooms.length > 0) {
    const chests = entities.filter(e => e.type === 'chest');
    const smallKeys = chests.filter(c => c.contents?.item === 'small_key').length;
    const lockedDoors = doors.filter(d => d.type === 'locked').length;
    if (smallKeys < lockedDoors) {
      err(`key economy: ${lockedDoors} locked door(s) but only ${smallKeys} small_key chest(s)`);
    }

    const hasBossDoor = doors.some(d => d.type === 'boss');
    const hasBossKey = chests.some(c => c.contents?.item === 'boss_key');
    if (hasBossDoor && !hasBossKey) {
      err('map has a boss door but no chest containing boss_key');
    }
  }

  // -------------------------------------------------------------------------
  // Check 9: entity room references must match a room id in this map
  // -------------------------------------------------------------------------
  entities.forEach((ent, ei) => {
    if (ent.room != null) {
      if (!roomIds.has(ent.room)) {
        err(`entity[${ei}] type '${ent.type}' references unknown room '${ent.room}'`);
      }
    }
  });

  return errors;
}

// ---------------------------------------------------------------------------
// Pre-build cross-map lookup sets
// ---------------------------------------------------------------------------

function buildCrossmapSets(maps) {
  const knownSets = new Set();
  const allEntityIds = new Set();
  const allDoorIds = new Set();

  for (const map of Object.values(maps)) {
    // Implicit flags: <mapId>_boss_dead for maps with rooms
    if (Array.isArray(map.rooms) && map.rooms.length > 0) {
      knownSets.add(`${map.id}_boss_dead`);
    }

    // Entity sets and ids
    if (Array.isArray(map.entities)) {
      for (const ent of map.entities) {
        if (ent.sets) knownSets.add(ent.sets);
        if (ent.id) allEntityIds.add(ent.id);
      }
    }

    // Door ids
    if (Array.isArray(map.doors)) {
      for (const door of map.doors) {
        if (door.id) allDoorIds.add(door.id);
      }
    }
  }

  return { knownSets, allEntityIds, allDoorIds };
}

// ---------------------------------------------------------------------------
// Run validation over a maps object
// ---------------------------------------------------------------------------

function runValidation(maps) {
  const { knownSets, allEntityIds, allDoorIds } = buildCrossmapSets(maps);
  const allErrors = [];

  for (const map of Object.values(maps)) {
    const errs = validateMap(map, maps, knownSets, allEntityIds, allDoorIds);
    allErrors.push(...errs);
  }

  return allErrors;
}

// ---------------------------------------------------------------------------
// Self-test fixtures
// ---------------------------------------------------------------------------

function runSelfTest() {
  console.log('\n--- Self-test mode ---\n');

  // Valid fixture: minimal dungeon map, no rooms, just a spawn
  const validMap = {
    id: 'selftest_valid',
    grid: [
      '###',
      '#.#',
      '###',
    ],
    entities: [
      { type: 'player_spawn', id: 'start', x: 1, y: 1 },
    ],
  };

  // Broken fixture: many intentional violations
  const brokenMap = {
    id: 'selftest_broken',
    grid: [
      '###',
      '#.Z',  // 'Z' is not in LEGEND
      '###',
    ],
    rooms: [
      { id: 'room1', x: 0, y: 0, w: 3, h: 3 },
      { id: 'room1', x: 0, y: 0, w: 3, h: 3 }, // duplicate room id
      { id: 'room_oob', x: 10, y: 10, w: 5, h: 5 }, // out of bounds
      { id: 'room_zero', x: 0, y: 0, w: 0, h: 0 }, // w=0,h=0
    ],
    doors: [
      // No id → required
      { x: 1, y: 1, dir: 'n', type: 'locked' },
      // Valid door for key economy (has id)
      { id: 'door1', x: 1, y: 1, dir: 'n', type: 'locked' },
      // bad dir and openWhen
      { id: 'door2', x: 1, y: 1, dir: 'z', type: 'boss', openWhen: 'flag:nonexistent_flag_xyz' },
      // door on solid cell
      { id: 'door3', x: 0, y: 0, dir: 's', type: 'shut' },
      // out of bounds
      { id: 'door4', x: 99, y: 99, dir: 'e' },
    ],
    entities: [
      // No player_spawn → violates check 5
      // Entity out of bounds
      { type: 'npc', id: 'npc1', x: 99, y: 99, dialogId: 'greet' },
      // Duplicate id
      { type: 'npc', id: 'npc1', x: 1, y: 1, dialogId: 'greet' },
      // Chest without id
      { type: 'chest', x: 1, y: 1, contents: { item: 'small_key' } },
      // npc on solid cell
      { type: 'npc', id: 'npc2', x: 0, y: 0, dialogId: 'wall' },
      // warp to unknown map
      { type: 'warp', x: 1, y: 1, to: { map: 'nonexistent_map', spawn: 'start' } },
      // entity referencing unknown room
      { type: 'skeleton', x: 1, y: 1, room: 'room_does_not_exist' },
    ],
  };

  const fixturesMaps = {
    selftest_valid: validMap,
    selftest_broken: brokenMap,
  };

  const allErrors = runValidation(fixturesMaps);

  // Split into per-map
  const validErrors = allErrors.filter(e => e.startsWith('selftest_valid:'));
  const brokenErrors = allErrors.filter(e => e.startsWith('selftest_broken:'));

  // --- Valid map should have zero errors ---
  if (validErrors.length === 0) {
    console.log('PASS: selftest_valid produced no errors');
  } else {
    console.log('FAIL: selftest_valid produced unexpected errors:');
    validErrors.forEach(e => console.log('  ', e));
  }

  // --- Broken map: assert specific expected errors ---
  const expectedPatterns = [
    /unknown char 'Z'/,
    /door\[0\] missing required id/,
    /duplicate id 'room1'/,
    /duplicate id 'npc1'/,
    /room 'room_oob' rect .* out of grid bounds/,
    /room 'room_zero' has non-positive width/,
    /room 'room_zero' has non-positive height/,
    /door\[3\] id 'door3' .* must be on a non-solid/,
    /door\[4\] id 'door4' .* out of bounds/,
    /door\[2\] id 'door2' has invalid dir 'z'/,
    /door 'door2' openWhen flag 'nonexistent_flag_xyz'/,
    /entity\[0\] type 'npc' id 'npc1' position .* out of bounds/,
    /entity\[1\] type 'npc' .* duplicate id 'npc1'|duplicate id 'npc1'/,
    /entity\[2\] type 'chest' missing required id/,
    /entity\[3\] type 'npc' id 'npc2' .* solid/,
    /warp entity .* references unknown map 'nonexistent_map'/,
    /entity\[5\] type 'skeleton' references unknown room 'room_does_not_exist'/,
    /map has no player_spawn/,
    /key economy: .* locked door/,
    /map has a boss door but no chest containing boss_key/,
  ];

  let allPassed = true;
  console.log('\nBroken map errors found:');
  brokenErrors.forEach(e => console.log(' ', e));
  console.log('\nChecking expected patterns:');
  for (const pat of expectedPatterns) {
    const hit = brokenErrors.some(e => pat.test(e));
    if (hit) {
      console.log(`  PASS: ${pat}`);
    } else {
      console.log(`  FAIL: no error matched ${pat}`);
      allPassed = false;
    }
  }

  if (validErrors.length === 0 && allPassed) {
    console.log('\nSelf-test PASSED.\n');
    return true;
  } else {
    console.log('\nSelf-test FAILED.\n');
    return false;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const selfTestPassed = SELF_TEST ? runSelfTest() : true;

const errors = runValidation(MAPS);

if (errors.length > 0) {
  for (const e of errors) {
    console.error(e);
  }
  process.exit(1);
} else {
  const n = Object.keys(MAPS).length;
  console.log(`OK (${n} map${n === 1 ? '' : 's'} validated)`);
  if (!selfTestPassed) process.exit(1);
}
