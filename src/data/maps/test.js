// Engine test map: a dungeon-style room complex joined to an outdoor area.
// Exercises every legend surface, wall style, props, and cuttables.
export default {
  id: 'test',
  grid: [
    '##########CCCCCCCCCCCC',
    '#........#CggggggggggC',
    '#.o....q.#Cgg,,gTTgggC',
    '#........#Cg,,ggTggRgC',
    '#..P..b..#CggggggggRgC',
    '#........#Cgg~~~gggggC',
    '#...x....#Cg~~~~~ggggC',
    '##.....###Cgg~~~ggdddC',
    '#......#CCCgggggdddggC',
    '#..*...#Cggg,,gddggggC',
    '#......._gggg,ddgg,ggC',
    '#......#Cgggggdgggg,gC',
    '#......#CggTggdgggggTC',
    '########CCCCCCdCCCCCCC',
    '########CCCCCCdCCCCCCC',
  ],
  entities: [
    { type: 'player_spawn', id: 'start', x: 4, y: 4 },
  ],
};
