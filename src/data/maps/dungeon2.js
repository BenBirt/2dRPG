// Dungeon 2 — The Drowned Cellars. Six rooms in a 2×3 block (23 cols × 30 rows):
//
//   E (boss-key)  |  F (boss)       rows 1-10
//   ──────────────────────────────  row 11 (wall: locked @ x=5, boss @ x=17)
//   B (fight/seal)|  C (eye/water)  rows 13-21
//   ──────────────────────────────  row 22 (wall: seal @ x=5, flag @ x=17)
//   A (entry)     |  D (small-key)  rows 23-27
//                  row 28/29: entrance gap
//
//  Col 11 is the vertical divider wall.
//  Left rooms:  cols 1-10 (w=10).  Right rooms: cols 12-21 (w=10).
//
//  Open passages (no door entity — just a '.' in the wall col):
//    B ↔ C : col 11, row 17
//    A ↔ D : col 11, row 25
//
//  Full progression:
//    A → B (walk in, seals, clear archers+skeletons, unseals)
//      → east passage col11/row17 into C
//      → shoot eye_switch at (21,15) along floor-lane row 15
//      → flag d2_inner_open opens door at (17,22) (C ↔ D gap)
//      → back west to B, south to A, east passage col11/row25 into D
//      → kill D guards, open small_key chest
//      → west to A, north to B, locked door (5,11) → E
//      → kill E guards, collect boss_key + bombs treasure
//      → south to B, east to C, north boss door (17,11) → F boss
//
//  Eye-switch lane: row 15, cols 12-21 are all '.' (no water in that row).
//  Water pool sits at rows 16-18 cols 14-20, flanking the eye alcove from below
//  — blocks walking to (21,15) via south but the arrow lane row 15 is clear.

export default {
  id: 'dungeon2',
  music: 'dungeon',
  grid: [
    //        0         1         2
    //        0123456789012345678901 2
    /* r=0  */ '#######################',
    /* r=1  */ '#o..*..*..*#*..*..*..*#',
    /* r=2  */ '#.P.......P#.P.......P#',
    /* r=3  */ '#.........*#..........#',
    /* r=4  */ '#.....b....#....*..P..#',
    /* r=5  */ '#..........#..........#',
    /* r=6  */ '#.o......o.#..*......*#',
    /* r=7  */ '#..........#..........#',
    /* r=8  */ '#.P.......P#.P.......P#',
    /* r=9  */ '#..........#..........#',
    /* r=10 */ '#..*.....*.#...*......#',
    /* r=11 */ '#####.###########.#####',
    /* r=12 */ '#####.###########.#####',
    /* r=13 */ '#*..q..o..*#*..q..o..*#',
    /* r=14 */ '#.P.......P#.P.......P#',
    /* r=15 */ '#..........#..........#',
    /* r=16 */ '#..........#~~.~~~~~.*#',
    /* r=17 */ '#...o...........~..*..#',
    /* r=18 */ '#..*.......#*.~~~~~~~.#',
    /* r=19 */ '#.P.......P#.P.......*#',
    /* r=20 */ '#..*.....*.#..........#',
    /* r=21 */ '#..........#q..*......#',
    /* r=22 */ '#####.###########.#####',
    /* r=23 */ '#q..*..o..o#q..*..*..q#',
    /* r=24 */ '#.o.......o#..q.......#',
    /* r=25 */ '#..........#..........#',
    /* r=26 */ '#*..*....o*#r..*...o.*#',
    /* r=27 */ '#.....*....#...r..o...#',
    /* r=28 */ '####.##################',
    /* r=29 */ '####.##################',
  ],
  rooms: [
    { id: 'r_entry',   x: 1,  y: 23, w: 10, h: 5 },
    { id: 'r_key',     x: 12, y: 23, w: 10, h: 5 },
    { id: 'r_fight',   x: 1,  y: 13, w: 10, h: 9 },
    { id: 'r_water',   x: 12, y: 13, w: 10, h: 9 },
    { id: 'r_bosskey', x: 1,  y: 1,  w: 10, h: 10 },
    { id: 'r_boss',    x: 12, y: 1,  w: 10, h: 10 },
  ],
  doors: [
    // A → B: sealed until fight room B is cleared
    { id: 'd2_door_seal',  x: 5,  y: 22, dir: 'n', type: 'shut',   openWhen: 'room_clear' },
    // C ↔ D: opens when eye_switch fires flag d2_inner_open
    { id: 'd2_door_inner', x: 17, y: 22, dir: 'n', type: 'shut',   openWhen: 'flag:d2_inner_open' },
    // B → E: locked door (consumes small_key)
    { id: 'd2_door_lock',  x: 5,  y: 12, dir: 'n', type: 'locked' },
    // C → F: boss door
    { id: 'd2_door_boss',  x: 17, y: 12, dir: 'n', type: 'boss'   },
  ],
  entities: [
    // ── Spawn / warp ──────────────────────────────────────────────────────────
    { type: 'player_spawn', id: 'entrance', x: 4, y: 27, dir: Math.PI },
    { type: 'warp', x: 4, y: 29, to: { map: 'overworld', spawn: 'd2_exit' } },

    // ── A — entry room ────────────────────────────────────────────────────────
    { type: 'lectern', id: 'd2_lect_entry', x: 2,  y: 23, dir: 's', dialogId: 'd2_entry' },
    { type: 'pickup',  id: 'd2_heart_a',    x: 8,  y: 26, kind: 'heart' },

    // ── B — first fight (sealed until clear) ──────────────────────────────────
    { type: 'skeleton_archer', x: 3,  y: 14, room: 'r_fight' },
    { type: 'skeleton_archer', x: 8,  y: 18, room: 'r_fight' },
    { type: 'skeleton',        x: 3,  y: 19, room: 'r_fight' },
    { type: 'skeleton',        x: 7,  y: 15, room: 'r_fight' },

    // ── C — eye-switch / water room ───────────────────────────────────────────
    // Arrow lane: row 15 all '.' from col 12 to 21. Eye at (21,15) dir 'w'.
    // Water pool rows 16-18 blocks walking south-approach to the eye alcove.
    { type: 'eye_switch', id: 'd2_eye_bridge', x: 21, y: 15, dir: 'w',
      sets: 'd2_inner_open' },
    { type: 'skeleton_archer', x: 14, y: 14, room: 'r_water' },
    { type: 'pickup', id: 'd2_arrows_c', x: 13, y: 20, kind: 'arrows5' },

    // ── D — small-key room ────────────────────────────────────────────────────
    { type: 'skeleton',        x: 14, y: 24, room: 'r_key' },
    { type: 'skeleton_archer', x: 19, y: 26, room: 'r_key' },
    { type: 'chest', id: 'd2_chest_key', x: 20, y: 23, dir: 's',
      contents: { item: 'small_key' } },

    // ── E — boss-key fight ────────────────────────────────────────────────────
    { type: 'skeleton',        x: 3,  y: 3,  room: 'r_bosskey' },
    { type: 'skeleton',        x: 8,  y: 7,  room: 'r_bosskey' },
    { type: 'skeleton_archer', x: 2,  y: 9,  room: 'r_bosskey' },
    { type: 'chest', id: 'd2_chest_bosskey', x: 9, y: 2, dir: 's',
      contents: { item: 'boss_key' } },
    // Cracked wall shortcut — bonus chest behind it
    { type: 'cracked_wall', id: 'd2_crack_bonus', x: 3, y: 6, dir: 'w' },
    { type: 'chest', id: 'd2_chest_bonus', x: 5, y: 6, dir: 'w',
      contents: { item: 'rupees', amount: 30 } },

    // ── TREASURE: Bombs (big chest) + lectern ─────────────────────────────────
    { type: 'chest',   id: 'd2_chest_bombs', x: 7, y: 2, dir: 's', big: true,
      contents: { item: 'bombs' } },
    { type: 'lectern', id: 'd2_note',         x: 5, y: 2, dir: 's',
      dialogId: 'd2_note' },

    // ── F — Boss 2 room ───────────────────────────────────────────────────────
    { type: 'boss2', x: 17, y: 6, room: 'r_boss' },
  ],
};
