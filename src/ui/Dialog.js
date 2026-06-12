// Typewriter dialog overlay. Game state is set to DIALOG while open; the
// attack action advances pages (first press completes the typing, second
// moves on).
export class Dialog {
  constructor(game) {
    this.game = game;
    this.el = document.getElementById('dialog');
    this.textEl = document.getElementById('dialog-text');
    this.moreEl = document.getElementById('dialog-more');
    this.pages = [];
    this.page = 0;
    this.chars = 0;
    this.timer = 0;
    this.speed = 45; // chars/sec
    this.onDone = null;
    this.active = false;

    // tapping the box advances too (mobile)
    this.el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (this.active) this.advance();
    });
  }

  show(pages, onDone = null) {
    this.pages = Array.isArray(pages) ? pages : [pages];
    this.page = 0;
    this.chars = 0;
    this.timer = 0;
    this.onDone = onDone;
    this.active = true;
    this.el.classList.remove('hidden');
    this._renderPage();
    this.game.setState('DIALOG');
  }

  _renderPage() {
    this.textEl.textContent = '';
    this.chars = 0;
    this.moreEl.style.visibility = 'hidden';
  }

  get pageText() {
    return this.pages[this.page] ?? '';
  }

  get typing() {
    return this.chars < this.pageText.length;
  }

  update(dt) {
    if (!this.active || !this.typing) return;
    this.timer += dt * this.speed;
    const want = Math.min(Math.floor(this.timer), this.pageText.length);
    if (want !== this.chars) {
      if (want > this.chars && want % 2 === 0) this.game.events.emit('sfx', 'blip');
      this.chars = want;
      this.textEl.textContent = this.pageText.slice(0, this.chars);
      if (!this.typing) this.moreEl.style.visibility = 'visible';
    }
  }

  advance() {
    if (!this.active) return;
    if (this.typing) {
      // reveal the whole page
      this.chars = this.pageText.length;
      this.timer = this.chars;
      this.textEl.textContent = this.pageText;
      this.moreEl.style.visibility = 'visible';
      return;
    }
    this.page++;
    if (this.page < this.pages.length) {
      this._renderPage();
      this.timer = 0;
    } else {
      this.close();
    }
  }

  close() {
    this.active = false;
    this.el.classList.add('hidden');
    const cb = this.onDone;
    this.onDone = null;
    if (this.game.state === 'DIALOG') this.game.setState('PLAYING');
    if (cb) cb();
  }
}
