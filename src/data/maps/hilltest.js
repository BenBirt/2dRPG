// Elevation smoke-test: a raised grassy plateau (level 1, cols 5-6 rows 3-5)
// walled by cliffs, a ramp up its south side at (5,6), a lake to the east,
// and a waterfall off the plateau's east edge. Cols 0-15, rows 0-9.
export default {
  id: 'hilltest',
  music: 'overworld',
  grid: [
    'CCCCCCCCCCCCCCCC',
    'CggggggggggggggC',
    'CgggCCCCg~~~~ggC',
    'CgggCggCg~~~~ggC',
    'CgggCggCg~~~~ggC',
    'CgggCggCg~~~~ggC',
    'CgggCgCCgggggggC',
    'CggggggggggggggC',
    'Cgggggggggg,,ggC',
    'CCCCCCCCCCCCCCCC',
  ],
  heights: [
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000011000000000',
    '0000011000000000',
    '0000011000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
    '0000000000000000',
  ],
  ramps: [
    { x: 5, y: 6, dir: 'n' }, // grass cell climbs north onto the plateau
  ],
  waterfalls: [
    { x: 6, y: 4, dir: 'e', to: 0 }, // plateau east edge → down toward the lake
  ],
  entities: [
    { type: 'player_spawn', id: 'start', x: 2, y: 5 },
  ],
};
