import { Assets } from './core/Assets.js';
import { Game } from './core/Game.js';
import { AudioSystem } from './audio/Audio.js';

const loadingEl = document.getElementById('loading');
const barEl = document.getElementById('loading-bar');
const textEl = document.getElementById('loading-text');

async function boot() {
  await Assets.preload((ratio) => {
    barEl.style.width = `${Math.round(ratio * 100)}%`;
    textEl.textContent = `Loading… ${Math.round(ratio * 100)}%`;
  });

  const game = new Game(document.getElementById('game'));
  game.audio = new AudioSystem(game);
  window.__game = game; // dev/testing hook

  game.start(); // shows the title screen

  // dev shortcut: ?map=dungeon1 skips the title/intro
  const params = new URLSearchParams(location.search);
  if (params.get('map')) {
    game.menus.hide();
    game.progress.location = { map: params.get('map'), spawn: params.get('spawn') || null };
    game.beginPlay();
  }

  loadingEl.classList.add('hidden');
}

boot().catch((err) => {
  textEl.textContent = `Failed to load: ${err.message}`;
  console.error(err);
});
