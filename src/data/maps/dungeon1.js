// Dungeon 1 — The Bramble Crypt. Six rooms in a 2x3 block:
//   E (boss)    F (bow treasure)
//   C (bosskey) D (small key)
//   A (entry)   B (first fight)
// Route: A → B (seals, room_clear) → D (small key) → locked door → C
// (boss key) → boss door → E (Skeleton Captain). F holds the Warden's Bow.
export default {
  id: 'dungeon1',
  music: 'dungeon',
  grid: [
    '#####################',
    '#...o...#.....*.....#',
    '#.....P.#...........#',
    '#.......#..P.....P..#',
    '#.P...o.#...........#',
    '#.......#....q......#',
    '#...*...#.....*.....#',
    '#####.#####.#########',
    '#.......#...........#',
    '#.o.....#..o......*.#',
    '#....P..#......P....#',
    '#...................#',
    '#..*....#.q.........#',
    '#....o..#........o..#',
    '#.......#...........#',
    '#################.###',
    '#.......#...........#',
    '#.......#....o.....q#',
    '#...*...#...........#',
    '#.............P.....#',
    '#.......#...........#',
    '#.......#.o.......*.#',
    '#####################',
  ],
  rooms: [
    { id: 'r_entry', x: 1, y: 16, w: 7, h: 6 },
    { id: 'r_fight', x: 9, y: 16, w: 11, h: 6 },
    { id: 'r_bosskey', x: 1, y: 8, w: 7, h: 7 },
    { id: 'r_key', x: 9, y: 8, w: 11, h: 7 },
    { id: 'r_boss', x: 1, y: 1, w: 7, h: 6 },
    { id: 'r_bow', x: 9, y: 1, w: 11, h: 6 },
  ],
  doors: [
    { id: 'd1_door_seal', x: 8, y: 19, dir: 'e', type: 'shut', openWhen: 'room_clear' },
    { id: 'd1_door_lock', x: 8, y: 11, dir: 'e', type: 'locked' },
    { id: 'd1_door_boss', x: 5, y: 7, dir: 'n', type: 'boss' },
  ],
  entities: [
    { type: 'player_spawn', id: 'entrance', x: 4, y: 20, dir: Math.PI },
    { type: 'warp', x: 4, y: 21, to: { map: 'overworld', spawn: 'd1_exit' } },
    { type: 'lectern', id: 'd1_note_lect', x: 2, y: 17, dir: 'e', dialogId: 'd1_note' },

    // B — first fight (sealed until clear)
    { type: 'skeleton', x: 12, y: 18, room: 'r_fight' },
    { type: 'skeleton', x: 16, y: 20, room: 'r_fight' },
    { type: 'skeleton', x: 18, y: 17, room: 'r_fight' },

    // D — small key
    { type: 'skeleton_archer', x: 17, y: 9, room: 'r_key' },
    { type: 'skeleton', x: 12, y: 13, room: 'r_key' },
    { type: 'chest', id: 'd1_chest_key', x: 18, y: 12, dir: 'w', contents: { item: 'small_key' } },

    // C — boss key
    { type: 'skeleton', x: 3, y: 10, room: 'r_bosskey' },
    { type: 'skeleton', x: 6, y: 13, room: 'r_bosskey' },
    { type: 'chest', id: 'd1_chest_bosskey', x: 2, y: 8, dir: 's', contents: { item: 'boss_key' } },
    { type: 'chest', id: 'd1_chest_rupees', x: 6, y: 8, dir: 's', contents: { item: 'rupees', amount: 20 } },

    // E — boss
    { type: 'boss1', x: 4, y: 3, room: 'r_boss' },

    // F — the Warden's Bow
    { type: 'chest', id: 'd1_chest_bow', x: 14, y: 2, dir: 's', big: true, contents: { item: 'bow' } },
    { type: 'lectern', id: 'd1_note_warden', x: 16, y: 2, dir: 's', dialogId: 'd1_note' },
    { type: 'skeleton_archer', x: 11, y: 4, room: 'r_bow' },
    { type: 'pickup', id: 'd1_heart_pickup', x: 18, y: 5, kind: 'heart' },
  ],
};
