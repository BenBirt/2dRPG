import { makeGrid, set, fillRect, outlineRect, path, scatter, toStrings } from './buildGrid.js';

// Playable prologue: the knight wakes on a storm-wrecked beach in a cliff cove
// and walks up the only path to Brookhollow. No combat — just a short, guided
// walk that grounds "how we got here" and teaches movement. Signs + a beached
// hull + Maren waiting at the cliff pass carry the story into the village.
const W = 30;
const H = 34;
const g = makeGrid(W, H, 'g');

// cove walls: cliffs all around, sea to the south, one path north out
outlineRect(g, 0, 0, W, H, 'C');
fillRect(g, 1, 26, W - 2, 8, '~');       // the sea filling the south
fillRect(g, 10, 24, 10, 3, 'd');          // wet sand beach where you wash up
scatter(g, 3, 20, 24, 6, 'R', 0.05, 5);   // shore rocks
scatter(g, 2, 3, 26, 16, 'T', 0.16, 41);  // wooded slopes
scatter(g, 2, 3, 26, 20, 'R', 0.03, 17);
scatter(g, 4, 14, 22, 12, ',', 0.1, 63);  // grass tufts

// the climbing path: beach -> a switchback up to the north pass
path(g, 15, 24, 15, 18, 'd');
path(g, 15, 18, 8, 18, 'd');
path(g, 8, 18, 8, 10, 'd');
path(g, 8, 10, 21, 10, 'd');
path(g, 21, 10, 21, 4, 'd');
path(g, 21, 4, 15, 4, 'd');
path(g, 15, 4, 15, 1, 'd');                // the pass out (north edge)
set(g, 15, 1, 'd');

// keep the pass framed by cliff
fillRect(g, 13, 1, 5, 1, 'C');
set(g, 15, 1, 'd');

export default {
  id: 'intro',
  music: 'title',
  backdrop: true,
  grid: toStrings(g),
  entities: [
    { type: 'player_spawn', id: 'wake', x: 15, y: 24, dir: Math.PI }, // face north/up
    // washed-up wreckage as scenery + story
    { type: 'sign', id: 'intro_hull', x: 13, y: 23, dir: 'e', dialogId: 'intro_hull' },
    { type: 'sign', id: 'intro_path', x: 8, y: 14, dir: 's', dialogId: 'intro_path' },
    { type: 'npc', id: 'maren_intro', x: 15, y: 3, model: 'mage', dialogId: 'maren_intro', dir: 's' },
    // stepping through the pass warps into the isle proper, at the village
    { type: 'warp', x: 15, y: 1, to: { map: 'overworld', spawn: 'from_cove' } },
  ],
};
