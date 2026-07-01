// Engine test map: a dungeon-style room complex joined to an outdoor area.
// Exercises surfaces, walls, props, cuttables, enemies, doors, chests, NPCs.
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
    '#......#Cgggggdggg,ggC',
    '#......#CggTggdgggggTC',
    '########CCCCCCdCCCCCCC',
    '########CCCCCCdCCCCCCC',
  ],
  rooms: [
    { id: 'r_top', x: 1, y: 1, w: 8, h: 6 },
    { id: 'r_bottom', x: 1, y: 8, w: 6, h: 5 },
  ],
  doors: [
    { id: 'test_door_lock', x: 4, y: 7, dir: 'n', type: 'locked' },
  ],
  entities: [
    { type: 'player_spawn', id: 'start', x: 4, y: 4 },
    { type: 'player_spawn', id: 'outside', x: 14, y: 10 },
    { type: 'skeleton', x: 7, y: 2, room: 'r_top' },
    { type: 'skeleton_archer', x: 17, y: 9 },
    { type: 'skeleton_mage', x: 13, y: 3 },
    { type: 'chest', id: 'test_chest_key', x: 2, y: 6, dir: 'e', contents: { item: 'small_key' } },
    { type: 'chest', id: 'test_chest_bow', x: 2, y: 9, dir: 's', big: true, contents: { item: 'bow' } },
    { type: 'npc', id: 'test_npc', x: 6, y: 9, model: 'mage', dialogId: 'elder_maren' },
    { type: 'sign', id: 'test_sign', x: 12, y: 8, dialogId: 'sign_village' },
    { type: 'eye_switch', id: 'test_eye', x: 5, y: 12, dir: 'n', sets: 'test_secret' },
    { type: 'warp', x: 14, y: 14, to: { map: 'test', spawn: 'start' } },
    { type: 'boss1', x: 4, y: 2, room: 'r_top' },
  ],
};
