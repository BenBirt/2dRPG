export class HUD {
  constructor(game) {
    this.game = game;

    // DOM refs
    this._hearts       = document.getElementById('hearts');
    this._counterKeys  = document.getElementById('counter-keys');
    this._counterArrows= document.getElementById('counter-arrows');
    this._counterBombs = document.getElementById('counter-bombs');
    this._counterRupees= document.getElementById('counter-rupees');
    this._bossBar      = document.getElementById('boss-bar');
    this._bossBarFill  = document.getElementById('boss-bar-fill');
    this._prompt       = document.getElementById('interact-prompt');
    this._btnItem      = document.getElementById('btn-item');
    this._btnCycle     = document.getElementById('btn-cycle');

    // Subscribe to events
    game.events.on('hearts-changed',   ()          => this._renderHearts());
    game.events.on('progress-changed', ()          => this._renderAll());
    game.events.on('map-entered',      ()          => this._renderCounters());
    game.events.on('boss-bar',         (payload)   => this._onBossBar(payload));
    game.events.on('interact-prompt',  (payload)   => this._onPrompt(payload));

    // Initial render
    this._renderAll();
  }

  // ---- hearts ---------------------------------------------------------------

  _renderHearts() {
    const { maxHearts, hearts } = this.game.progress;
    if (!this._hearts) return;

    let html = '';
    for (let i = 0; i < maxHearts; i++) {
      // hearts counts half-hearts: i*2 gives the half-heart index for this slot
      const halfsFilled = hearts - i * 2;
      if (halfsFilled >= 2) {
        html += '<span class="h-full">♥</span>';
      } else if (halfsFilled === 1) {
        html += '<span class="h-half">♥</span>';
      } else {
        html += '<span class="h-empty">♥</span>';
      }
    }
    this._hearts.innerHTML = html;
  }

  // ---- counters -------------------------------------------------------------

  _renderCounters() {
    const p = this.game.progress;

    // Keys: only show when current map is a dungeon (has rooms array)
    const mapDef = this.game.world?.mapDef;
    const isDungeon = Array.isArray(mapDef?.rooms);
    const keyCount  = isDungeon ? (p.keys[mapDef.id] ?? 0) : 0;

    this._setCounter(this._counterKeys,   keyCount,  isDungeon);
    this._setCounter(this._counterArrows, p.arrows,  p.hasBow);
    this._setCounter(this._counterBombs,  p.bombs,   p.hasBombs);
    this._setCounter(this._counterRupees, p.rupees,  true);

    // highlight which item the item-button currently fires
    this._counterArrows?.classList.toggle('equipped', p.equipped === 'bow');
    this._counterBombs?.classList.toggle('equipped', p.equipped === 'bombs');

    // Touch item button label
    if (this._btnItem) {
      if (p.equipped === 'bow')   this._btnItem.textContent = '🏹';
      else if (p.equipped === 'bombs') this._btnItem.textContent = '💣';
      else                        this._btnItem.textContent = 'A';
    }

    // Cycle button: visible only when player has both items to cycle between
    if (this._btnCycle) {
      if (p.hasBow && p.hasBombs) {
        this._btnCycle.classList.remove('hidden');
      } else {
        this._btnCycle.classList.add('hidden');
      }
    }
  }

  /** Set a counter element's <b> text and show/hide the whole counter. */
  _setCounter(el, value, visible) {
    if (!el) return;
    const b = el.querySelector('b');
    if (b) b.textContent = value;
    if (visible) {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  }

  // ---- combined render ------------------------------------------------------

  _renderAll() {
    this._renderHearts();
    this._renderCounters();
  }

  // ---- boss bar -------------------------------------------------------------

  _onBossBar({ show, hp, maxHp } = {}) {
    if (!this._bossBar) return;
    if (show) {
      this._bossBar.classList.remove('hidden');
      if (this._bossBarFill) {
        const pct = maxHp > 0 ? (hp / maxHp) * 100 : 0;
        this._bossBarFill.style.width = `${pct}%`;
      }
    } else {
      this._bossBar.classList.add('hidden');
    }
  }

  // ---- interact prompt ------------------------------------------------------

  _onPrompt(text) {
    if (!this._prompt) return;
    if (text) {
      this._prompt.textContent = text;
      this._prompt.classList.remove('hidden');
    } else {
      this._prompt.classList.add('hidden');
    }
  }
}
