/**
 * Sfx.js — Synthesized one-shot sound effects using WebAudio oscillators/noise.
 * All sounds are built from scratch; no audio files required.
 */

/** All valid SFX names, used for static verification. */
export const SFX_NAMES = [
  'sword', 'cut', 'player_hurt', 'enemy_hurt', 'enemy_die',
  'boss_die', 'boss_swing', 'boss_slam', 'boss_roar',
  'pickup', 'rupee', 'key', 'chest', 'fanfare',
  'door_open', 'door_shut', 'denied', 'secret',
  'arrow', 'arrow_hit', 'bolt', 'magic', 'teleport',
  'fuse', 'explosion', 'crumble', 'summon', 'blip', 'cycle',
];

export class Sfx {
  /**
   * @param {AudioContext} ctx
   * @param {GainNode} outGain
   */
  constructor(ctx, outGain) {
    this._ctx = ctx;
    this._out = outGain;
    this._noiseBuf = null; // lazily built
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /** Play a named sound effect. Unknown names are silently ignored. */
  play(name) {
    if (!this._ctx) return;
    const ctx = this._ctx;

    switch (name) {
      case 'sword':       this._sword(ctx); break;
      case 'cut':         this._cut(ctx); break;
      case 'player_hurt': this._playerHurt(ctx); break;
      case 'enemy_hurt':  this._enemyHurt(ctx); break;
      case 'enemy_die':   this._enemyDie(ctx); break;
      case 'boss_die':    this._bossDie(ctx); break;
      case 'boss_swing':  this._bossSwing(ctx); break;
      case 'boss_slam':   this._bossSlam(ctx); break;
      case 'boss_roar':   this._bossRoar(ctx); break;
      case 'pickup':      this._pickup(ctx); break;
      case 'rupee':       this._rupee(ctx); break;
      case 'key':         this._key(ctx); break;
      case 'chest':       this._chest(ctx); break;
      case 'fanfare':     this._fanfare(ctx); break;
      case 'door_open':   this._doorOpen(ctx); break;
      case 'door_shut':   this._doorShut(ctx); break;
      case 'denied':      this._denied(ctx); break;
      case 'secret':      this._secret(ctx); break;
      case 'arrow':       this._arrow(ctx); break;
      case 'arrow_hit':   this._arrowHit(ctx); break;
      case 'bolt':        this._bolt(ctx); break;
      case 'magic':       this._magic(ctx); break;
      case 'teleport':    this._teleport(ctx); break;
      case 'fuse':        this._fuse(ctx); break;
      case 'explosion':   this._explosion(ctx); break;
      case 'crumble':     this._crumble(ctx); break;
      case 'summon':      this._summon(ctx); break;
      case 'blip':        this._blip(ctx); break;
      case 'cycle':       this._cycle(ctx); break;
      // Unknown names: do nothing
      default: break;
    }
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  /** Build (or return cached) white-noise buffer ~1 second. */
  _noise() {
    if (this._noiseBuf) return this._noiseBuf;
    const ctx = this._ctx;
    const sr = ctx.sampleRate;
    const len = sr; // 1 second
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this._noiseBuf = buf;
    return buf;
  }

  /** Create a noise source node. */
  _noiseSource() {
    const src = this._ctx.createBufferSource();
    src.buffer = this._noise();
    src.loop = true;
    return src;
  }

  /**
   * Connect a node chain to the output gain and start/stop.
   * @param {AudioNode[]} chain - chain of nodes; first is source (has .start), last connects to out
   * @param {number} startTime
   * @param {number} stopTime
   */
  _connect(chain, startTime, stopTime) {
    for (let i = 0; i < chain.length - 1; i++) {
      chain[i].connect(chain[i + 1]);
    }
    chain[chain.length - 1].connect(this._out);
    chain[0].start(startTime);
    chain[0].stop(stopTime);
  }

  // ---------------------------------------------------------------------------
  // Sound implementations
  // ---------------------------------------------------------------------------

  /** sword — white-noise swish, bandpass with downward freq sweep, 0.12s */
  _sword(ctx) {
    const t = ctx.currentTime;
    const src = this._noiseSource();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(2400, t);
    bp.frequency.linearRampToValueAtTime(800, t + 0.12);
    bp.Q.value = 2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.6, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    this._connect([src, bp, g], t, t + 0.13);
  }

  /** cut — similar to sword but brighter and shorter, 0.08s */
  _cut(ctx) {
    const t = ctx.currentTime;
    const src = this._noiseSource();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(3600, t);
    bp.frequency.linearRampToValueAtTime(1600, t + 0.08);
    bp.Q.value = 3;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    this._connect([src, bp, g], t, t + 0.09);
  }

  /** player_hurt — square wave 220→110Hz, 0.25s */
  _playerHurt(ctx) {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.25);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.35, t);
    g.gain.setValueAtTime(0.35, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    this._connect([osc, g], t, t + 0.26);
  }

  /** enemy_hurt — square 160Hz, short, 0.1s */
  _enemyHurt(ctx) {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.1);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    this._connect([osc, g], t, t + 0.11);
  }

  /** enemy_die — noise + square descending, 0.3s */
  _enemyDie(ctx) {
    const t = ctx.currentTime;
    // Noise component
    const src = this._noiseSource();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1200, t);
    lp.frequency.exponentialRampToValueAtTime(200, t + 0.3);
    const gn = ctx.createGain();
    gn.gain.setValueAtTime(0.3, t);
    gn.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    this._connect([src, lp, gn], t, t + 0.31);
    // Square component
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.3);
    const go = ctx.createGain();
    go.gain.setValueAtTime(0.25, t);
    go.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    this._connect([osc, go], t, t + 0.31);
  }

  /** boss_die — big descending sweep + noise, 1.2s */
  _bossDie(ctx) {
    const t = ctx.currentTime;
    // Noise burst
    const src = this._noiseSource();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(3000, t);
    lp.frequency.exponentialRampToValueAtTime(80, t + 1.2);
    const gn = ctx.createGain();
    gn.gain.setValueAtTime(0.5, t);
    gn.gain.setValueAtTime(0.5, t + 0.1);
    gn.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    this._connect([src, lp, gn], t, t + 1.21);
    // Descending sawtooth sweep
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 1.2);
    const go = ctx.createGain();
    go.gain.setValueAtTime(0.4, t);
    go.gain.setValueAtTime(0.4, t + 0.15);
    go.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    this._connect([osc, go], t, t + 1.21);
  }

  /** boss_swing — low whoosh, bandpass noise sweep, 0.2s */
  _bossSwing(ctx) {
    const t = ctx.currentTime;
    const src = this._noiseSource();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(120, t);
    bp.frequency.linearRampToValueAtTime(400, t + 0.1);
    bp.frequency.linearRampToValueAtTime(80, t + 0.2);
    bp.Q.value = 1.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    this._connect([src, bp, g], t, t + 0.21);
  }

  /** boss_slam — low thud 80Hz sine + noise, 0.35s */
  _bossSlam(ctx) {
    const t = ctx.currentTime;
    // Sine thud
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.35);
    const go = ctx.createGain();
    go.gain.setValueAtTime(0.7, t);
    go.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    this._connect([osc, go], t, t + 0.36);
    // Noise click transient
    const src = this._noiseSource();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 600;
    const gn = ctx.createGain();
    gn.gain.setValueAtTime(0.5, t);
    gn.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    this._connect([src, lp, gn], t, t + 0.09);
  }

  /** boss_roar — sawtooth 70→50Hz sweep, 0.6s */
  _bossRoar(ctx) {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(70, t);
    osc.frequency.linearRampToValueAtTime(50, t + 0.6);
    // Add a slight vibrato via LFO
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 6;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 4;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.01, t);
    g.gain.linearRampToValueAtTime(0.5, t + 0.1);
    g.gain.setValueAtTime(0.5, t + 0.4);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    osc.connect(g);
    g.connect(this._out);
    lfo.start(t); lfo.stop(t + 0.61);
    osc.start(t); osc.stop(t + 0.61);
  }

  /** pickup — sine arpeggio E5-G5, 0.15s */
  _pickup(ctx) {
    const t = ctx.currentTime;
    const freqs = [659.25, 783.99]; // E5, G5
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      const g = ctx.createGain();
      const on = t + i * 0.075;
      g.gain.setValueAtTime(0.0, on);
      g.gain.linearRampToValueAtTime(0.4, on + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, on + 0.075);
      this._connect([osc, g], on, on + 0.08);
    });
  }

  /** rupee — sine B5-E6, 0.12s */
  _rupee(ctx) {
    const t = ctx.currentTime;
    const freqs = [987.77, 1318.51]; // B5, E6
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      const g = ctx.createGain();
      const on = t + i * 0.06;
      g.gain.setValueAtTime(0.0, on);
      g.gain.linearRampToValueAtTime(0.35, on + 0.008);
      g.gain.exponentialRampToValueAtTime(0.001, on + 0.06);
      this._connect([osc, g], on, on + 0.065);
    });
  }

  /** key — triangle G5-C6, 0.2s */
  _key(ctx) {
    const t = ctx.currentTime;
    const freqs = [783.99, 1046.5]; // G5, C6
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = f;
      const g = ctx.createGain();
      const on = t + i * 0.1;
      g.gain.setValueAtTime(0.0, on);
      g.gain.linearRampToValueAtTime(0.4, on + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, on + 0.1);
      this._connect([osc, g], on, on + 0.11);
    });
  }

  /** chest — rising triangle arpeggio, 0.4s */
  _chest(ctx) {
    const t = ctx.currentTime;
    // C5-E5-G5-C6
    const freqs = [523.25, 659.25, 783.99, 1046.5];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = f;
      const g = ctx.createGain();
      const on = t + i * 0.1;
      g.gain.setValueAtTime(0.0, on);
      g.gain.linearRampToValueAtTime(0.38, on + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, on + 0.1);
      this._connect([osc, g], on, on + 0.11);
    });
  }

  /** fanfare — triumphant 5-note square arpeggio C-E-G-C-E ~0.9s */
  _fanfare(ctx) {
    const t = ctx.currentTime;
    // C4-E4-G4-C5-E5
    const freqs = [261.63, 329.63, 392.00, 523.25, 659.25];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = f;
      const g = ctx.createGain();
      const on = t + i * 0.18;
      const dur = (i === freqs.length - 1) ? 0.35 : 0.16;
      g.gain.setValueAtTime(0.0, on);
      g.gain.linearRampToValueAtTime(0.3, on + 0.01);
      g.gain.setValueAtTime(0.3, on + dur - 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, on + dur);
      this._connect([osc, g], on, on + dur + 0.01);
    });
  }

  /** door_open — filtered noise + low slide up, 0.3s */
  _doorOpen(ctx) {
    const t = ctx.currentTime;
    const src = this._noiseSource();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(300, t);
    lp.frequency.linearRampToValueAtTime(900, t + 0.3);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    this._connect([src, lp, g], t, t + 0.31);
    // Low tone slide
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.linearRampToValueAtTime(220, t + 0.3);
    const go = ctx.createGain();
    go.gain.setValueAtTime(0.2, t);
    go.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    this._connect([osc, go], t, t + 0.31);
  }

  /** door_shut — thud, 0.2s */
  _doorShut(ctx) {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.2);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.6, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    const src = this._noiseSource();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 400;
    const gn = ctx.createGain();
    gn.gain.setValueAtTime(0.35, t);
    gn.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    this._connect([osc, g], t, t + 0.21);
    this._connect([src, lp, gn], t, t + 0.07);
  }

  /** denied — square buzz 110Hz, two bursts, 0.2s total */
  _denied(ctx) {
    const t = ctx.currentTime;
    [0, 0.11].forEach(offset => {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = 110;
      const g = ctx.createGain();
      const on = t + offset;
      g.gain.setValueAtTime(0.3, on);
      g.gain.exponentialRampToValueAtTime(0.001, on + 0.09);
      this._connect([osc, g], on, on + 0.1);
    });
  }

  /** secret — 8 fast ascending semitone notes, 0.6s */
  _secret(ctx) {
    const t = ctx.currentTime;
    // Start at A4, go up 8 semitones (A4 to F5 area)
    const baseFreq = 440; // A4
    for (let i = 0; i < 8; i++) {
      const freq = baseFreq * Math.pow(2, i / 12);
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = freq;
      const g = ctx.createGain();
      const on = t + i * 0.075;
      g.gain.setValueAtTime(0.0, on);
      g.gain.linearRampToValueAtTime(0.25, on + 0.008);
      g.gain.exponentialRampToValueAtTime(0.001, on + 0.075);
      this._connect([osc, g], on, on + 0.08);
    }
  }

  /** arrow — short noise whip, 0.1s */
  _arrow(ctx) {
    const t = ctx.currentTime;
    const src = this._noiseSource();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(3000, t);
    bp.frequency.exponentialRampToValueAtTime(800, t + 0.1);
    bp.Q.value = 4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.4, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    this._connect([src, bp, g], t, t + 0.11);
  }

  /** arrow_hit — tick, 0.05s */
  _arrowHit(ctx) {
    const t = ctx.currentTime;
    const src = this._noiseSource();
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    this._connect([src, hp, g], t, t + 0.06);
  }

  /** bolt — square zap 330→180Hz, 0.15s */
  _bolt(ctx) {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(330, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.15);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    this._connect([osc, g], t, t + 0.16);
  }

  /** magic — sine shimmer 660+880 beating together, 0.3s */
  _magic(ctx) {
    const t = ctx.currentTime;
    [660, 880].forEach(freq => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0, t);
      g.gain.linearRampToValueAtTime(0.2, t + 0.05);
      g.gain.setValueAtTime(0.2, t + 0.25);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      this._connect([osc, g], t, t + 0.31);
    });
  }

  /** teleport — sine sweep up 200→900Hz, 0.25s */
  _teleport(ctx) {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(900, t + 0.25);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0, t);
    g.gain.linearRampToValueAtTime(0.4, t + 0.05);
    g.gain.setValueAtTime(0.4, t + 0.2);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    this._connect([osc, g], t, t + 0.26);
  }

  /** fuse — one short tick sound (called once per bomb place) */
  _fuse(ctx) {
    const t = ctx.currentTime;
    const src = this._noiseSource();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1800;
    bp.Q.value = 8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    this._connect([src, bp, g], t, t + 0.05);
  }

  /** explosion — lowpassed noise burst + 60Hz sine thump, 0.6s */
  _explosion(ctx) {
    const t = ctx.currentTime;
    // Noise burst
    const src = this._noiseSource();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(2000, t);
    lp.frequency.exponentialRampToValueAtTime(100, t + 0.6);
    const gn = ctx.createGain();
    gn.gain.setValueAtTime(0.7, t);
    gn.gain.setValueAtTime(0.7, t + 0.05);
    gn.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    this._connect([src, lp, gn], t, t + 0.61);
    // 60Hz thump
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(60, t);
    osc.frequency.exponentialRampToValueAtTime(25, t + 0.4);
    const go = ctx.createGain();
    go.gain.setValueAtTime(0.8, t);
    go.gain.setValueAtTime(0.8, t + 0.03);
    go.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    this._connect([osc, go], t, t + 0.41);
  }

  /** crumble — filtered brownish noise, 0.5s */
  _crumble(ctx) {
    const t = ctx.currentTime;
    const src = this._noiseSource();
    // Low bandpass for rumble quality
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(600, t);
    lp.frequency.exponentialRampToValueAtTime(100, t + 0.5);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.setValueAtTime(0.5, t + 0.1);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    this._connect([src, lp, g], t, t + 0.51);
  }

  /** summon — minor-third rising pair, 0.3s */
  _summon(ctx) {
    const t = ctx.currentTime;
    // E4 → G4 (minor third)
    const freqs = [329.63, 392.00];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      const g = ctx.createGain();
      const on = t + i * 0.15;
      g.gain.setValueAtTime(0.0, on);
      g.gain.linearRampToValueAtTime(0.35, on + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, on + 0.15);
      this._connect([osc, g], on, on + 0.16);
    });
  }

  /** blip — 5ms 880Hz square, very quiet, dialog typewriter */
  _blip(ctx) {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 880;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.04, t); // VERY quiet
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.005);
    this._connect([osc, g], t, t + 0.006);
  }

  /** cycle — two-tone click for equipment swap, 0.1s */
  _cycle(ctx) {
    const t = ctx.currentTime;
    [880, 1100].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = freq;
      const g = ctx.createGain();
      const on = t + i * 0.05;
      g.gain.setValueAtTime(0.18, on);
      g.gain.exponentialRampToValueAtTime(0.001, on + 0.05);
      this._connect([osc, g], on, on + 0.06);
    });
  }
}
