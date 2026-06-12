import { Save } from '../core/Save.js';

// All full-screen DOM menus: title, intro pages, pause, game over, victory.
export class Menus {
  constructor(game) {
    this.game = game;
    this.el = document.getElementById('menu');
  }

  hide() {
    this.el.classList.add('hidden');
    this.el.innerHTML = '';
  }

  _show(html) {
    this.el.innerHTML = html;
    this.el.classList.remove('hidden');
  }

  _btn(label, fn, cls = 'menu-btn') {
    const b = document.createElement('button');
    b.className = cls;
    b.textContent = label;
    b.addEventListener('click', fn);
    this.el.appendChild(b);
    return b;
  }

  showTitle() {
    this._show(`
      <h1>The Hollow Isle</h1>
      <p>The light is failing. The dead are walking.<br>Someone has to mend what the Warden broke.</p>
    `);
    this._btn('New Game', () => this.game.newGame());
    if (Save.exists()) {
      this._btn('Continue', () => this.game.continueGame());
    }
    this._btn('Import Save', async () => {
      try {
        const progress = await Save.importFile();
        this.game.loadProgress(progress);
      } catch (e) {
        this.flash(e.message);
      }
    });
    this._btn(this.game.audio?.muted ? 'Sound: Off' : 'Sound: On', (e) => {
      const muted = this.game.toggleMute();
      e.target.textContent = muted ? 'Sound: Off' : 'Sound: On';
    });
  }

  // Sequential story pages with a single advance button.
  showIntro(pages, onDone) {
    let i = 0;
    const render = () => {
      this._show(`<p class="intro-page">${pages[i]}</p>`);
      this._btn(i < pages.length - 1 ? 'Continue' : 'Begin', () => {
        i++;
        if (i < pages.length) render();
        else {
          this.hide();
          onDone();
        }
      });
    };
    render();
  }

  showPause() {
    this._show('<h2>Paused</h2>');
    this._btn('Resume', () => this.game.resume());
    this._btn('Export Save', () => Save.exportFile(this.game.progress));
    this._btn('Import Save', async () => {
      try {
        const progress = await Save.importFile();
        this.game.loadProgress(progress);
      } catch (e) {
        this.flash(e.message);
      }
    });
    this._btn(this.game.audio?.muted ? 'Sound: Off' : 'Sound: On', (e) => {
      const muted = this.game.toggleMute();
      e.target.textContent = muted ? 'Sound: Off' : 'Sound: On';
    });
    this._btn('Quit to Title', () => this.game.toTitle());
  }

  showGameOver() {
    this._show('<h2>You have fallen…</h2><p>The isle still needs you.</p>');
    this._btn('Rise Again', () => this.game.respawn());
    this._btn('Quit to Title', () => this.game.toTitle());
  }

  showVictory(lines) {
    this._show(`<h1>Dawn Returns</h1><p>${lines}</p>`);
    this._btn('Back to Title', () => this.game.toTitle());
  }

  flash(message) {
    const p = document.createElement('p');
    p.textContent = message;
    p.style.color = '#e07050';
    this.el.appendChild(p);
    setTimeout(() => p.remove(), 2500);
  }
}
