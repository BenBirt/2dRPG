// Dungeon 2 — The Drowned Cellars. PLACEHOLDER: entry room only; the full
// dungeon (water themes, archers, Boss 2 Crypt Eye, bombs reward) replaces
// this.
export default {
  id: 'dungeon2',
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
    { type: 'warp', x: 5, y: 5, to: { map: 'overworld', spawn: 'd2_exit' } },
  ],
};
