// Dungeon 3 — The Hollow Sanctum. Seven rooms (25 cols × 32 rows):
//
//  col: 0        12       24
//       +---------+--------+
//  y=1  | r_boss — 23×9 full-width open arena (cols 1-23, rows 1-9)
//       |  P pillars near edges, rubble at centre, torches
//  y=9  +---------+--------+
//  y=10 (wall — boss door at x=6 dir n)
//  y=11 +---------+--------+
//       |r_bigfight|r_bosskey  rows 11-17
//  y=17 +---------+--------+
//  y=18 (wall — open passage left x=5; open passage right x=18)
//  y=19 +---------+--------+
//       | r_eye    | r_key   rows 19-25
//  y=25 +---------+--------+
//  y=26 (wall — locked door x=5; flag-shut door x=18)
//  y=27 +---------+--------+
//       |r_colonnade|r_junct  rows 27-30
//  y=31 (south wall — solid)
//
//  Col 12 = vertical divider wall (except open-passage rows).
//  Left rooms: cols 1-11 (w=11). Right rooms: cols 13-23 (w=11).
//
//  Open passages (floor cell in divider, no door entity):
//    r_bigfight ↔ r_bosskey  at col 12, row 14
//    r_eye      ↔ r_key      at col 12, row 22  (also is the eye-arrow lane row)
//    r_colonnade seal door    at col 12, row 29  (shut/room_clear)
//
//  Cracked walls (player has bombs from dungeon2):
//    d3_crack_a at (12, 28) dir 'w': blocks west passage from junction into
//      colonnade nook. Bombing reveals a hidden path west; archer + small_key
//      chest lurk in the nook (colonnade west alcove).
//    d3_crack_b at (22, 27) dir 'e': blocks east nook of junction (23,27-28).
//      Bombing reveals bonus chest d3_chest_bonus (rupees 50).
//
//  Eye-switch (r_eye, row 22):
//    Eye at (11, 22) dir 'w'. Arrow lane: row 22 cols 1-10 all '.' (clear floor).
//    Col 12 row 22 = '.' (passage). Eye faces west; player shoots east→west.
//    sets flag 'd3_seal_open' → opens flag door at (18, 26).
//
//  Lectern d3_note: placed at (4, 11) inside r_bigfight, facing north — the
//    Warden's last words, readable on the way to the boss door.
//
//  Full progression:
//    spawn(colonnade) → colonnade fight seals on entry (skeleton_mages + skeletons)
//    → clears → seal door (12,29) opens → east into r_junction
//    → bomb crack_a (12,28) → colonnade nook (archer ambush + small_key chest)
//    → bomb crack_b (22,27) → bonus chest (rupees)
//    → locked door (5,26) from colonnade north → r_eye
//    → shoot eye_switch (11,22) → d3_seal_open → flag door (18,26) opens
//    → back south to junction → flag door (18,26) north → r_key
//    → big fight in r_key (2 mages + 2 archers + skeleton)
//    → r_key north passage (18,18) → r_bosskey → boss_key chest
//    → passage (12,14) west → r_bigfight → read lectern → boss door (6,10) → r_boss

export default {
  id: 'dungeon3',
  music: 'dungeon',
  grid: [
    //        0         1         2
    //        0123456789012345678901234
    /* r=0  */ '#########################',
    /* r=1  */ '#P.....*.........*.....P#',
    /* r=2  */ '#..p.................p..#',
    /* r=3  */ '#.......................#',
    /* r=4  */ '#..p.......r.r.......p..#',
    /* r=5  */ '#.......................#',
    /* r=6  */ '#P...P.....r.r.....P...P#',
    /* r=7  */ '#.......................#',
    /* r=8  */ '#..p.................p..#',
    /* r=9  */ '#P.....*.........*.....P#',
    /* r=10 */ '######.##################',
    /* r=11 */ '#..*......p.#.p......*..#',
    /* r=12 */ '#...........#...........#',
    /* r=13 */ '#..r........#........r..#',
    /* r=14 */ '#..p.....p.....p.....p..#',
    /* r=15 */ '#...........#...........#',
    /* r=16 */ '#..r........#........r..#',
    /* r=17 */ '#..*.....*..#..*.....*..#',
    /* r=18 */ '##################.######',
    /* r=19 */ '#..p.....p..#..p.....p..#',
    /* r=20 */ '#...........#...........#',
    /* r=21 */ '#..r.....*..#........*..#',
    /* r=22 */ '#...........#...........#',
    /* r=23 */ '#...........#...........#',
    /* r=24 */ '#..r.....*..#........*..#',
    /* r=25 */ '#..*.....*..#..*.....*..#',
    /* r=26 */ '#####.############.######',
    /* r=27 */ '#.p...p.....#.p.........#',
    /* r=28 */ '#......................##',
    /* r=29 */ '#...*............*......#',
    /* r=30 */ '#...........#...........#',
    /* r=31 */ '#########################',
  ],
  rooms: [
    { id: 'r_boss',      x: 1,  y: 1,  w: 23, h: 9  },
    { id: 'r_bigfight',  x: 1,  y: 11, w: 11, h: 7  },
    { id: 'r_bosskey',   x: 13, y: 11, w: 11, h: 7  },
    { id: 'r_eye',       x: 1,  y: 19, w: 11, h: 7  },
    { id: 'r_key',       x: 13, y: 19, w: 11, h: 7  },
    { id: 'r_colonnade', x: 1,  y: 27, w: 11, h: 4  },
    { id: 'r_junction',  x: 13, y: 27, w: 11, h: 4  },
  ],
  doors: [
    // Boss door: r_bigfight north into r_boss (wall row 10, x=6)
    { id: 'd3_door_boss', x: 6,  y: 10, dir: 'n', type: 'boss'   },
    // r_colonnade → r_eye: locked door (wall row 26, x=5)
    { id: 'd3_door_lock', x: 5,  y: 26, dir: 'n', type: 'locked' },
    // r_junction → r_key: flag-shut (wall row 26, x=18; set by eye_switch)
    { id: 'd3_door_flag', x: 18, y: 26, dir: 'n', type: 'shut',
      openWhen: 'flag:d3_seal_open' },
    // r_colonnade fight seal (divider col 12, row 29; shut until colonnade clear)
    { id: 'd3_door_seal', x: 12, y: 29, dir: 'e', type: 'shut',
      openWhen: 'room_clear' },
  ],
  entities: [
    // ── Spawn / warp ──────────────────────────────────────────────────────────
    { type: 'player_spawn', id: 'entrance', x: 5, y: 28, dir: Math.PI },
    { type: 'warp', x: 5, y: 30, to: { map: 'overworld', spawn: 'd3_exit' } },

    // ── r_colonnade — entry fight (sealed until clear) ────────────────────────
    { type: 'skeleton_mage',   x: 8,  y: 28, room: 'r_colonnade' },
    { type: 'skeleton_mage',   x: 9,  y: 28, room: 'r_colonnade' },
    { type: 'skeleton',        x: 6,  y: 29, room: 'r_colonnade' },
    // Cracked wall crack_a on divider col 12 row 28 — blocks junction→colonnade nook
    { type: 'cracked_wall', id: 'd3_crack_a', x: 12, y: 28, dir: 'w' },
    // Archer ambush in colonnade nook (accessible via bombing crack_a)
    { type: 'skeleton_archer', x: 2,  y: 28, room: 'r_colonnade' },
    // Small-key chest inside colonnade nook
    { type: 'chest', id: 'd3_chest_key', x: 3, y: 27, dir: 'e',
      contents: { item: 'small_key' } },

    // ── r_junction — junction room ────────────────────────────────────────────
    // crack_b at (22,27) dir 'e' — bombs open east nook of junction (23,27-28)
    { type: 'cracked_wall', id: 'd3_crack_b', x: 22, y: 27, dir: 'e' },
    { type: 'chest', id: 'd3_chest_bonus', x: 23, y: 27, dir: 'w',
      contents: { item: 'rupees', amount: 50 } },
    { type: 'pickup', id: 'd3_bomb1', x: 18, y: 28, kind: 'bomb1' },

    // ── r_eye — eye switch room ────────────────────────────────────────────────
    // Eye at (11,22) dir 'w'. Arrow lane: row 22 cols 1-10 all '.' (no props).
    // Player enters from south, stands at e.g. x=9 y=22, shoots east to (11,22).
    { type: 'eye_switch', id: 'd3_eye_seal', x: 11, y: 22, dir: 'w',
      sets: 'd3_seal_open' },
    { type: 'skeleton_archer', x: 4,  y: 20, room: 'r_eye' },
    { type: 'skeleton_mage',   x: 8,  y: 23, room: 'r_eye' },
    { type: 'pickup', id: 'd3_heart_mid', x: 3, y: 24, kind: 'heart' },

    // ── r_key — big fight (2 mages + 2 archers + 1 skeleton) ─────────────────
    { type: 'skeleton_mage',   x: 15, y: 20, room: 'r_key' },
    { type: 'skeleton_mage',   x: 21, y: 23, room: 'r_key' },
    { type: 'skeleton_archer', x: 17, y: 21, room: 'r_key' },
    { type: 'skeleton_archer', x: 20, y: 20, room: 'r_key' },
    { type: 'skeleton',        x: 16, y: 24, room: 'r_key' },

    // ── r_bosskey — boss key chest ────────────────────────────────────────────
    { type: 'chest', id: 'd3_chest_bosskey', x: 18, y: 12, dir: 's',
      contents: { item: 'boss_key' } },
    { type: 'skeleton_mage',   x: 16, y: 14, room: 'r_bosskey' },
    { type: 'skeleton_archer', x: 21, y: 16, room: 'r_bosskey' },

    // ── r_bigfight — pre-boss corridor ────────────────────────────────────────
    { type: 'skeleton_mage',   x: 3,  y: 13, room: 'r_bigfight' },
    { type: 'skeleton_archer', x: 8,  y: 15, room: 'r_bigfight' },
    { type: 'skeleton',        x: 5,  y: 16, room: 'r_bigfight' },
    // Lectern — the Warden's last words, just south of the boss door
    { type: 'lectern', id: 'd3_note', x: 4, y: 11, dir: 'n', dialogId: 'd3_note' },

    // ── r_boss — Boss 3 arena ─────────────────────────────────────────────────
    { type: 'boss3', x: 12, y: 5, room: 'r_boss' },
  ],
};
