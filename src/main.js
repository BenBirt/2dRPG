import { Assets } from './core/Assets.js';
import { Game } from './core/Game.js';

const loadingEl = document.getElementById('loading');
const barEl = document.getElementById('loading-bar');
const textEl = document.getElementById('loading-text');

async function boot() {
  await Assets.preload((ratio) => {
    barEl.style.width = `${Math.round(ratio * 100)}%`;
    textEl.textContent = `Loading… ${Math.round(ratio * 100)}%`;
  });

  const game = new Game(document.getElementById('game'));
  window.__game = game; // dev/testing hook

  // M1: drop straight into the test map; title screen arrives with Menus.
  const params = new URLSearchParams(location.search);
  game.enterMap(params.get('map') || 'test', null);
  game.setState('PLAYING');
  game.start();

  loadingEl.classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
}

boot().catch((err) => {
  textEl.textContent = `Failed to load: ${err.message}`;
  console.error(err);
});
