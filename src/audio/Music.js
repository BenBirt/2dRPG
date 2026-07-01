/**
 * Music.js — Lookahead step-sequencer for chiptune themes.
 *
 * Architecture:
 *   - Scheduler fires every SCHEDULE_INTERVAL ms
 *   - Looks LOOKAHEAD ms ahead and pre-schedules notes
 *   - Each theme gets per-theme GainNodes for crossfading
 *   - Loops seamlessly by tracking an absolute "clock" in beats
 */

import { THEMES } from '../data/music.js';

/** Convert a MIDI note number to frequency in Hz. */
export function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

const SCHEDULE_INTERVAL = 100; // ms between scheduler ticks
const LOOKAHEAD = 200;         // ms ahead to schedule
const CROSSFADE_TIME = 0.8;    // seconds for theme crossfade

export class Music {
  /**
   * @param {AudioContext} ctx
   * @param {GainNode} outGain
   */
  constructor(ctx, outGain) {
    this._ctx = ctx;
    this._out = outGain;

    this._currentTheme = null;
    this._currentGain = null;   // GainNode for current theme
    this._schedulerId = null;

    // Sequencer state
    this._stepTime = 0;         // AudioContext time of next step 0
    this._stepIndex = 0;        // current 16th-note step within pattern
    this._totalSteps = 0;       // total 16th-note steps in current pattern
    this._stepDuration = 0;     // duration of one 16th note in seconds

    // Noise buffer reference (built lazily)
    this._noiseBuf = null;

    // Track active nodes per voice for cleanup
    this._activeNodes = [];
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /** Switch to a named theme with crossfade. */
  setTheme(name) {
    if (!this._ctx) return;
    if (name === this._currentTheme) return;

    const themeData = THEMES[name];
    if (!themeData) {
      console.warn(`Music: unknown theme '${name}'`);
      return;
    }

    // Build a gain node for the incoming theme
    const incomingGain = this._ctx.createGain();
    incomingGain.gain.setValueAtTime(0, this._ctx.currentTime);
    incomingGain.gain.linearRampToValueAtTime(1, this._ctx.currentTime + CROSSFADE_TIME);
    incomingGain.connect(this._out);

    // Fade out old theme gain node
    if (this._currentGain) {
      const oldGain = this._currentGain;
      const t = this._ctx.currentTime;
      oldGain.gain.setValueAtTime(oldGain.gain.value, t);
      oldGain.gain.linearRampToValueAtTime(0, t + CROSSFADE_TIME);
      // Disconnect after fade
      setTimeout(() => {
        try { oldGain.disconnect(); } catch (_) {}
      }, (CROSSFADE_TIME + 0.1) * 1000);
    }

    // Stop existing scheduler
    if (this._schedulerId !== null) {
      clearInterval(this._schedulerId);
      this._schedulerId = null;
    }

    // Stop all currently active nodes after crossfade
    const nodesToStop = [...this._activeNodes];
    const stopTime = this._ctx.currentTime + CROSSFADE_TIME;
    nodesToStop.forEach(node => {
      try { node.stop(stopTime); } catch (_) {}
    });
    this._activeNodes = [];

    // Set up new theme
    this._currentTheme = name;
    this._currentGain = incomingGain;

    const bps = themeData.bpm / 60;
    this._stepDuration = 1 / (bps * 4); // 16th note = quarter / 4
    this._totalSteps = themeData.bars * 16;
    this._stepIndex = 0;
    this._stepTime = this._ctx.currentTime + 0.05; // small offset to let crossfade settle

    // Start scheduler
    this._schedulerId = setInterval(() => this._schedule(), SCHEDULE_INTERVAL);
    this._schedule(); // immediate first pass
  }

  /** Stop all music immediately. */
  stop() {
    if (this._schedulerId !== null) {
      clearInterval(this._schedulerId);
      this._schedulerId = null;
    }
    this._activeNodes.forEach(node => {
      try { node.stop(); } catch (_) {}
    });
    this._activeNodes = [];
    if (this._currentGain) {
      const t = this._ctx?.currentTime ?? 0;
      this._currentGain.gain.setValueAtTime(this._currentGain.gain.value, t);
      this._currentGain.gain.linearRampToValueAtTime(0, t + 0.2);
      const g = this._currentGain;
      setTimeout(() => { try { g.disconnect(); } catch (_) {} }, 300);
      this._currentGain = null;
    }
    this._currentTheme = null;
  }

  // ---------------------------------------------------------------------------
  // Internal scheduler
  // ---------------------------------------------------------------------------

  _schedule() {
    if (!this._ctx || !this._currentTheme) return;
    const ctx = this._ctx;
    const theme = THEMES[this._currentTheme];
    if (!theme) return;

    const now = ctx.currentTime;
    const scheduleUntil = now + LOOKAHEAD / 1000;

    while (this._stepTime < scheduleUntil) {
      this._scheduleStep(theme, this._stepIndex, this._stepTime);
      this._stepIndex = (this._stepIndex + 1) % this._totalSteps;
      this._stepTime += this._stepDuration;
    }
  }

  /**
   * Schedule all notes that fall on a given step index.
   * @param {object} theme
   * @param {number} stepIdx  0-indexed 16th-note step
   * @param {number} t        AudioContext time for this step
   */
  _scheduleStep(theme, stepIdx, t) {
    const ctx = this._ctx;
    const gain = this._currentGain;
    if (!gain) return;
    const tracks = theme.tracks;

    // --- Lead voice (square, gain ~0.12) ---
    if (tracks.lead) {
      for (const [step, midi, len] of tracks.lead) {
        if (step === stepIdx) {
          const freq = midiToFreq(midi);
          const dur = len * this._stepDuration;
          this._playTone(ctx, gain, 'square', freq, 0.22, t, dur);
        }
      }
    }

    // --- Bass voice (triangle, gain ~0.15) ---
    if (tracks.bass) {
      for (const [step, midi, len] of tracks.bass) {
        if (step === stepIdx) {
          const freq = midiToFreq(midi);
          const dur = len * this._stepDuration;
          this._playTone(ctx, gain, 'triangle', freq, 0.28, t, dur);
        }
      }
    }

    // --- Arp/pad voice (sine slightly detuned, gain ~0.08) ---
    if (tracks.arp && tracks.arp.length > 0) {
      for (const [step, midi, len] of tracks.arp) {
        if (step === stepIdx) {
          const freq = midiToFreq(midi);
          const dur = len * this._stepDuration;
          this._playTone(ctx, gain, 'sine', freq, 0.15, t, dur);
          // Slight detune for pad shimmer
          this._playTone(ctx, gain, 'sine', freq * 1.003, 0.08, t, dur);
        }
      }
    }

    // --- Kick (sine thud) ---
    if (tracks.kick && tracks.kick.includes(stepIdx)) {
      this._playKick(ctx, gain, t);
    }

    // --- Hat (noise tick) ---
    if (tracks.hat && tracks.hat.includes(stepIdx)) {
      this._playHat(ctx, gain, t);
    }
  }

  /**
   * Schedule a tone with attack/release envelope.
   * @param {AudioContext} ctx
   * @param {GainNode} themeGain  - per-theme gain for crossfade
   * @param {OscillatorType} type
   * @param {number} freq
   * @param {number} amplitude    - peak gain
   * @param {number} t            - start time
   * @param {number} dur          - note duration in seconds
   */
  _playTone(ctx, themeGain, type, freq, amplitude, t, dur) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;

    const env = ctx.createGain();
    const attack = Math.min(0.01, dur * 0.1);
    const release = Math.min(0.04, dur * 0.3);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(amplitude, t + attack);
    env.gain.setValueAtTime(amplitude, t + dur - release);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc.connect(env);
    env.connect(themeGain);

    osc.start(t);
    osc.stop(t + dur + 0.01);
    this._activeNodes.push(osc);

    // Prune finished nodes periodically to avoid memory growth
    if (this._activeNodes.length > 512) {
      this._activeNodes = this._activeNodes.slice(-256);
    }
  }

  /** Schedule a kick drum (low sine thud). */
  _playKick(ctx, themeGain, t) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.12);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.08, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);

    osc.connect(env);
    env.connect(themeGain);
    osc.start(t);
    osc.stop(t + 0.16);
    this._activeNodes.push(osc);
  }

  /** Schedule a hi-hat (filtered noise tick). */
  _playHat(ctx, themeGain, t) {
    const src = ctx.createBufferSource();
    src.buffer = this._getNoiseBuf(ctx);
    src.loop = false;

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 8000;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.08, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);

    src.connect(hp);
    hp.connect(env);
    env.connect(themeGain);
    src.start(t);
    src.stop(t + 0.05);
    this._activeNodes.push(src);
  }

  /** Get or create a short white-noise buffer for percussion. */
  _getNoiseBuf(ctx) {
    if (this._noiseBuf) return this._noiseBuf;
    const sr = ctx.sampleRate;
    const len = Math.floor(sr * 0.1); // 100ms
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this._noiseBuf = buf;
    return buf;
  }
}
