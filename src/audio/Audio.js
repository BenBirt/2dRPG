/**
 * Audio.js — Main audio system entry point.
 *
 * Wire-up:
 *   import { AudioSystem } from './audio/Audio.js';
 *   game.audio = new AudioSystem(game);
 *
 * The system defers AudioContext creation until the first user gesture
 * (pointerdown or keydown), to comply with browser autoplay policies.
 * Music theme requests buffered before unlock are played once the context
 * is running.
 */

import { Sfx } from './Sfx.js';
import { Music } from './Music.js';

const MUTE_KEY = 'hollowisle.muted';
const MASTER_GAIN_LEVEL = 0.9;
const MUSIC_GAIN_LEVEL  = 0.85;
const SFX_GAIN_LEVEL    = 1.0;

export class AudioSystem {
  /**
   * @param {import('../core/Game.js').Game} game
   */
  constructor(game) {
    this._game = game;

    /** @type {AudioContext|null} */
    this._ctx = null;

    /** @type {GainNode|null} */
    this._masterGain = null;

    /** @type {GainNode|null} */
    this._musicGain = null;

    /** @type {GainNode|null} */
    this._sfxGain = null;

    /** @type {Sfx|null} */
    this._sfx = null;

    /** @type {Music|null} */
    this._music = null;

    /** Mute state — loaded from localStorage immediately. */
    this.muted = localStorage.getItem(MUTE_KEY) === '1';

    /** The most recently requested music theme, even before unlock. */
    this._pendingTheme = null;

    /** Whether the AudioContext has been unlocked. */
    this._unlocked = false;

    // Subscribe to game event bus
    this._game.events.on('sfx', name => this._onSfx(name));
    this._game.events.on('music', theme => this._onMusic(theme));

    // Attach one-time unlock listeners for first user gesture
    this._boundUnlock = () => this._unlock();
    window.addEventListener('pointerdown', this._boundUnlock, { once: true });
    window.addEventListener('keydown', this._boundUnlock, { once: true });
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Toggle mute state.
   * Persists to localStorage; applies a short gain ramp.
   * @returns {boolean} new muted state
   */
  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0');

    if (this._masterGain) {
      const t = this._ctx.currentTime;
      this._masterGain.gain.cancelScheduledValues(t);
      this._masterGain.gain.setValueAtTime(this._masterGain.gain.value, t);
      this._masterGain.gain.linearRampToValueAtTime(
        this.muted ? 0 : MASTER_GAIN_LEVEL,
        t + 0.05
      );
    }

    return this.muted;
  }

  // ---------------------------------------------------------------------------
  // Internal — event handlers
  // ---------------------------------------------------------------------------

  _onSfx(name) {
    if (this._sfx) this._sfx.play(name);
  }

  _onMusic(theme) {
    this._pendingTheme = theme;
    if (this._music) this._music.setTheme(theme);
  }

  // ---------------------------------------------------------------------------
  // Internal — unlock on first user gesture
  // ---------------------------------------------------------------------------

  async _unlock() {
    // Remove the sibling listener that wasn't triggered
    window.removeEventListener('pointerdown', this._boundUnlock);
    window.removeEventListener('keydown', this._boundUnlock);

    if (this._unlocked) return;
    this._unlocked = true;

    try {
      // Create AudioContext
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this._ctx = new AudioContextClass();

      if (this._ctx.state === 'suspended') {
        await this._ctx.resume();
      }

      // Build gain graph: sfxGain, musicGain → masterGain → destination
      this._masterGain = this._ctx.createGain();
      this._masterGain.gain.value = this.muted ? 0 : MASTER_GAIN_LEVEL;
      this._masterGain.connect(this._ctx.destination);

      this._musicGain = this._ctx.createGain();
      this._musicGain.gain.value = MUSIC_GAIN_LEVEL;
      this._musicGain.connect(this._masterGain);

      this._sfxGain = this._ctx.createGain();
      this._sfxGain.gain.value = SFX_GAIN_LEVEL;
      this._sfxGain.connect(this._masterGain);

      // Instantiate subsystems
      this._sfx   = new Sfx(this._ctx, this._sfxGain);
      this._music = new Music(this._ctx, this._musicGain);

      // Play any buffered theme
      if (this._pendingTheme) {
        this._music.setTheme(this._pendingTheme);
      }
    } catch (err) {
      console.warn('AudioSystem: failed to initialize AudioContext:', err);
    }
  }
}
