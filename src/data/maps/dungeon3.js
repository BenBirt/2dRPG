// Dungeon 3 — The Hollow Sanctum. PLACEHOLDER: entry room only; the full
// dungeon (cracked-wall shortcuts, mages, Boss 3 Bone Colossus, finale)
// replaces this.
export default {
  id: 'dungeon3',
  music: 'dungeon',
  grid: [
    '###########',
    '#.........#',
    '#.o.....o.#',
    '#.........#',
    '#....*....#',
    '#.........#',
    '###########',
  ],
  rooms: [
    { id: 'r_entry', x: 1, y: 1, w: 9, h: 5 },
  ],
  entities: [
    { type: 'player_spawn', id: 'entrance', x: 5, y: 4, dir: Math.PI },
    { type: 'warp', x: 5, y: 5, to: { map: 'overworld', spawn: 'd3_exit' } },
  ],
};
