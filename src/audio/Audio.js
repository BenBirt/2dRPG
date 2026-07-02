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

    // Resume on EVERY early interaction (not once): a single missed gesture,
    // a context that starts suspended, or a mobile browser that ignores the
    // first attempt should not leave the game silent. The handlers detach
    // themselves once the context is confirmed running.
    this._boundResume = () => this._unlock();
    for (const ev of ['pointerdown', 'touchend', 'touchstart', 'keydown', 'click']) {
      window.addEventListener(ev, this._boundResume, { passive: true });
    }
    // Halt all audio while the page is backgrounded (another app is in front)
    // and restore it on return. Without this the media session opened for iOS
    // keeps the mix playing after you leave the browser.
    document.addEventListener('visibilitychange', () => {
      if (!this._ctx) return;
      if (document.hidden) {
        if (this._ctx.state === 'running') this._ctx.suspend();
      } else if (this._ctx.state === 'suspended' && !this.muted) {
        this._ctx.resume();
      }
    });
  }

  _isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  _detachResume() {
    for (const ev of ['pointerdown', 'touchend', 'touchstart', 'keydown', 'click']) {
      window.removeEventListener(ev, this._boundResume);
    }
  }

  // iOS mutes the Web Audio API when the hardware ringer switch is silent,
  // UNLESS a media element has played in the session. A one-shot silent
  // HTMLAudioElement during the unlock gesture opens the media channel so
  // music/SFX are audible regardless of the ringer switch.
  _unmuteIOS() {
    // Only iOS needs this; on Android the media session it opens keeps audio
    // playing after the browser is backgrounded, which we don't want.
    if (this._iosUnmuted || !this._isIOS()) return;
    this._iosUnmuted = true;
    try {
      const el = document.createElement('audio');
      el.setAttribute('playsinline', '');
      // 0.05s of silence, base64 WAV — plays once, not looped
      el.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
      el.volume = 0.001;
      const p = el.play();
      if (p && p.catch) p.catch(() => {});
    } catch (_) { /* non-fatal */ }
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
    // open the iOS media channel every gesture until it takes
    this._unmuteIOS();

    // Already running? make sure the resume listeners are gone and stop.
    if (this._ctx && this._ctx.state === 'running') {
      this._detachResume();
      return;
    }

    try {
      if (!this._ctx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        this._ctx = new AudioContextClass();
      }
      if (this._ctx.state === 'suspended') {
        await this._ctx.resume();
      }
      // if it still hasn't started, leave the listeners attached to retry on
      // the next gesture
      if (this._ctx.state !== 'running') return;

      if (this._unlocked) { this._detachResume(); return; }
      this._unlocked = true;
      this._detachResume();

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
