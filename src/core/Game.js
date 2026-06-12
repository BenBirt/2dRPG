import * as THREE from 'three';
import { Loop } from './Loop.js';
import { Events } from './Events.js';
import { Save } from './Save.js';
import { Input } from '../input/Input.js';
import { Keyboard } from '../input/Keyboard.js';
import { Touch } from '../input/Touch.js';
import { World } from '../world/World.js';
import { RoomManager } from '../world/RoomManager.js';
import { CameraRig } from '../camera/CameraRig.js';
import { Player } from '../entities/Player.js';
import { Pickup } from '../entities/Pickup.js';
import { Arrow } from '../entities/projectiles/Arrow.js';
import { Bomb } from '../entities/projectiles/Bomb.js';
import { HUD } from '../ui/HUD.js';
import { Dialog } from '../ui/Dialog.js';
import { Menus } from '../ui/Menus.js';
import { PLAYER, ITEMS, TILE } from '../data/balance.js';
import { MAPS } from '../data/maps/index.js';
import { INTRO_PAGES, VICTORY_TEXT, getDialog } from '../data/dialog.js';

export function newProgress() {
  return {
    maxHearts: PLAYER.startHearts,
    hearts: PLAYER.startHearts * 2,
    hasSword: true,
    hasBow: false,
    hasBombs: false,
    arrows: 0,
    bombs: 0,
    rupees: 0,
    equipped: null, // 'bow' | 'bombs'
    keys: {}, // per-dungeon small key counts
    flags: new Set(),
    location: { map: 'overworld', spawn: 'start' },
  };
}

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.events = new Events();
    this.state = 'TITLE';

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x10141f);
    this.scene.fog = new THREE.Fog(0x10141f, 30, 60);

    this.hemi = new THREE.HemisphereLight(0xcfe0ff, 0x4a4036, 1.25);
    this.sun = new THREE.DirectionalLight(0xfff1d8, 1.7);
    this.sun.position.set(6, 12, 4);
    this.scene.add(this.hemi, this.sun);

    this.cameraRig = new CameraRig(window.innerWidth / window.innerHeight);
    this.input = new Input();
    this.input.addSource(new Keyboard(this.input));
    this.touch = new Touch(this.input);
    this.input.addSource(this.touch);

    this.world = new World(this);
    this.rooms = new RoomManager(this);
    this.player = null;
    this.progress = newProgress();
    this.audio = null; // attached by Audio module at boot

    this.hud = new HUD(this);
    this.dialog = new Dialog(this);
    this.menus = new Menus(this);
    this.fadeEl = document.getElementById('fade');

    this._deathTimer = null;
    this._promptText = undefined;

    this.events.on('player-died', () => {
      this._deathTimer = 1.4;
    });
    this.events.on('flag-set', () => this.autosave());

    this.loop = new Loop(
      (dt) => this.update(dt),
      () => this.renderer.render(this.scene, this.cameraRig.camera)
    );

    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  resize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.cameraRig.setAspect(window.innerWidth / window.innerHeight);
  }

  start() {
    this.loop.start();
    this.toTitle();
  }

  // ------------------------------------------------------ flow / menus

  toTitle() {
    this.setState('TITLE');
    this.world.unload();
    this.player = null;
    document.getElementById('hud').classList.add('hidden');
    this.menus.showTitle();
    this.events.emit('music', 'title');
  }

  newGame() {
    this.progress = newProgress();
    this.menus.hide();
    this.menus.showIntro(INTRO_PAGES, () => {
      this.beginPlay();
      this.autosave();
    });
    this.events.emit('music', 'intro');
  }

  continueGame() {
    const progress = Save.load();
    if (!progress) return this.menus.flash('Save could not be read.');
    this.loadProgress(progress);
  }

  loadProgress(progress) {
    this.progress = progress;
    this.menus.hide();
    this.beginPlay();
  }

  beginPlay() {
    document.getElementById('hud').classList.remove('hidden');
    this.enterMap(this.progress.location.map, this.progress.location.spawn);
    this.setState('PLAYING');
    this.events.emit('progress-changed');
    this.events.emit('hearts-changed');
  }

  pause() {
    if (this.state !== 'PLAYING') return;
    this.setState('PAUSED');
    this.menus.showPause();
  }

  resume() {
    this.menus.hide();
    this.setState('PLAYING');
  }

  respawn() {
    this.menus.hide();
    this.progress.hearts = this.progress.maxHearts * 2;
    this.beginPlay();
  }

  victory() {
    this.setState('VICTORY');
    this.autosave();
    document.getElementById('hud').classList.add('hidden');
    this.menus.showVictory(VICTORY_TEXT);
    this.events.emit('music', 'victory');
  }

  // ------------------------------------------------------ map / world

  enterMap(mapId, spawnId) {
    const mapDef = MAPS[mapId];
    if (!mapDef) throw new Error(`Unknown map: ${mapId}`);
    this.world.load(mapDef);
    this.rooms.reset();
    this.cameraRig.setMapBounds(this.world.cols, this.world.rows);
    this.cameraRig.mode = mapDef.rooms?.length ? 'room' : 'follow';
    this.cameraRig.setRoom(null, true);

    const spawn = this.world.spawnPoint(spawnId);
    if (!this.player) this.player = new Player(this, spawn.x, spawn.z);
    this.player.pos.set(spawn.x, 0, spawn.z);
    this.player.knock.set(0, 0);
    this.player.iframes = 0;
    if (this.progress.hearts > 0) this.player.alive = true;
    if (spawn.dir !== undefined) this.player.facing = spawn.dir;
    if (this.player.state !== 'idle') this.player.releaseScripted();
    this.player.mesh.visible = true;
    this._deathTimer = null;
    this.world.addEntity(this.player);
    this.world.spawnMapEntities();

    this.progress.location = { map: mapId, spawn: spawnId };
    this.rooms.update(); // set initial room before first frame
    this.cameraRig.snapTo(this.player.pos);
    this.events.emit('map-entered', mapId);
    this.events.emit('music', mapDef.music ?? (mapDef.rooms?.length ? 'dungeon' : 'overworld'));
  }

  warpTo(mapId, spawnId) {
    if (this.state !== 'PLAYING') return;
    this.setState('TRANSITION');
    this.fadeEl.classList.add('on');
    setTimeout(() => {
      this.enterMap(mapId, spawnId);
      this.autosave();
      this.fadeEl.classList.remove('on');
      this.setState('PLAYING');
    }, 240);
  }

  // ------------------------------------------------------ progress

  setFlag(flag) {
    if (this.progress.flags.has(flag)) return;
    this.progress.flags.add(flag);
    this.events.emit('flag-set', flag);
  }

  autosave() {
    if (this.player) Save.write(this.progress);
  }

  toggleMute() {
    if (!this.audio) return true;
    return this.audio.toggleMute();
  }

  grantChestContents(contents, chest) {
    const p = this.progress;
    const mapId = this.world.mapDef.id;
    let dialogId = null;
    switch (contents.item) {
      case 'small_key':
        p.keys[mapId] = (p.keys[mapId] ?? 0) + 1;
        dialogId = 'get_small_key';
        break;
      case 'boss_key':
        this.setFlag(`${mapId}_bosskey`);
        dialogId = 'get_boss_key';
        break;
      case 'bow':
        p.hasBow = true;
        p.equipped = 'bow';
        p.arrows = Math.max(p.arrows, 15);
        dialogId = 'get_bow';
        break;
      case 'bombs':
        p.hasBombs = true;
        p.equipped ??= 'bombs';
        p.bombs = Math.max(p.bombs, ITEMS.bombs.maxBombs);
        dialogId = 'get_bombs';
        break;
      case 'heart_container':
        p.maxHearts = Math.min(p.maxHearts + 1, PLAYER.maxHeartsCap);
        p.hearts = p.maxHearts * 2;
        dialogId = 'get_heart_container';
        break;
      case 'rupees':
        p.rupees += contents.amount ?? 20;
        break;
      default:
        if (contents.dialogId) dialogId = contents.dialogId;
    }
    this.events.emit('progress-changed');
    this.events.emit('hearts-changed');
    this.autosave();

    if (dialogId) {
      const big = chest?.def?.big || ['bow', 'bombs', 'heart_container'].includes(contents.item);
      this.itemGetCutscene(dialogId, big);
    }
  }

  // Boss reward: heart container + shard story beat; dungeon 3 rolls into
  // the ending.
  collectHeartContainer(persistFlag) {
    const p = this.progress;
    const mapId = this.world.mapDef.id;
    p.maxHearts = Math.min(p.maxHearts + 1, PLAYER.maxHeartsCap);
    p.hearts = p.maxHearts * 2;
    if (persistFlag) this.setFlag(persistFlag);
    this.events.emit('progress-changed');
    this.events.emit('hearts-changed');
    this.autosave();

    const pages = [...getDialog('get_heart_container', p)];
    const shard = { dungeon1: 'get_shard1', dungeon2: 'get_shard2', dungeon3: 'get_shard3' }[mapId];
    if (shard) pages.push(...getDialog(shard, p));

    this.player.playScripted('cheer', { once: true, duration: 1.2 });
    this.events.emit('sfx', 'fanfare');
    this.dialog.show(pages, () => {
      this.player.releaseScripted();
      if (mapId === 'dungeon3') this.victory();
    });
  }

  itemGetCutscene(dialogId, big) {
    this.player.playScripted('pickup', { once: true, duration: big ? 1.0 : 0.7 });
    this.events.emit('sfx', big ? 'fanfare' : 'key');
    this.dialog.show(getDialog(dialogId, this.progress), () => {
      this.player.releaseScripted();
    });
  }

  startDialog(dialogId) {
    this.dialog.show(getDialog(dialogId, this.progress));
  }

  // ------------------------------------------------------ player actions

  shootArrow(player) {
    const p = this.progress;
    if (p.arrows <= 0) {
      this.events.emit('sfx', 'denied');
      return;
    }
    p.arrows--;
    player.itemCooldown = ITEMS.bow.cooldown;
    player.state = 'item';
    player.stateTime = 0;
    player.anim.play('1H_Ranged_Shoot', { once: true, duration: 0.32 });
    const f = player.facingVec();
    this.world.addEntity(new Arrow(this, player,
      player.x + f.x * 0.5, player.z + f.z * 0.5, f.x, f.z));
    this.events.emit('sfx', 'arrow');
    this.events.emit('progress-changed');
  }

  placeBomb(player) {
    const p = this.progress;
    if (p.bombs <= 0) {
      this.events.emit('sfx', 'denied');
      return;
    }
    const f = player.facingVec();
    const bx = player.x + f.x * 1.3;
    const bz = player.z + f.z * 1.3;
    if (this.world.collision.circleHitsSolid(bx, bz, 0.3)) {
      this.events.emit('sfx', 'denied');
      return;
    }
    p.bombs--;
    player.itemCooldown = ITEMS.bombs.cooldown;
    player.state = 'item';
    player.stateTime = 0;
    player.anim.play('Throw', { once: true, duration: 0.35 });
    this.world.addEntity(new Bomb(this, bx, bz));
    this.events.emit('sfx', 'fuse');
    this.events.emit('progress-changed');
  }

  spawnPickup(x, z, kind, opts) {
    this.world.addEntity(new Pickup(this, x, z, kind, opts));
  }

  spawnExplosionEffect(x, z, radius) {
    const geo = new THREE.SphereGeometry(1, 12, 8);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffa040, transparent: true, opacity: 0.85,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.6, z);
    this.scene.add(mesh);
    const t0 = performance.now();
    const tick = () => {
      const t = (performance.now() - t0) / 280;
      if (t >= 1) {
        this.scene.remove(mesh);
        geo.dispose();
        mat.dispose();
        return;
      }
      mesh.scale.setScalar(0.3 + t * radius);
      mat.opacity = 0.85 * (1 - t);
      requestAnimationFrame(tick);
    };
    tick();
  }

  cycleEquipped() {
    const p = this.progress;
    const options = [];
    if (p.hasBow) options.push('bow');
    if (p.hasBombs) options.push('bombs');
    if (options.length < 2) return;
    const i = options.indexOf(p.equipped);
    p.equipped = options[(i + 1) % options.length];
    this.events.emit('sfx', 'cycle');
    this.events.emit('progress-changed');
  }

  // ------------------------------------------------------ frame update

  setState(state) {
    const prev = this.state;
    this.state = state;
    this.events.emit('state-changed', { prev, state });
  }

  _updatePrompt() {
    const target = this.player ? this.world.interactableNear(this.player) : null;
    const text = target?.promptText ?? null;
    if (text !== this._promptText) {
      this._promptText = text;
      this.events.emit('interact-prompt', text);
    }
  }

  update(dt) {
    this.input.update();

    switch (this.state) {
      case 'PLAYING': {
        if (this.input.justPressed('pause')) {
          this.pause();
          break;
        }
        if (this.input.justPressed('cycle')) this.cycleEquipped();
        this.world.update(dt);
        this.rooms.update();
        this.cameraRig.update(dt, this.player.pos);
        this._updatePrompt();

        if (this._deathTimer !== null) {
          this._deathTimer -= dt;
          if (this._deathTimer <= 0) {
            this._deathTimer = null;
            this.setState('GAMEOVER');
            this.menus.showGameOver();
            this.events.emit('music', 'gameover');
          }
        }
        break;
      }

      case 'DIALOG':
        this.dialog.update(dt);
        if (this.input.justPressed('attack') || this.input.justPressed('item')) {
          this.dialog.advance();
        }
        // keep idle/scripted animations alive behind the text
        this.player?.anim.update(dt);
        break;

      case 'TRANSITION':
        this.cameraRig.update(dt, this.player.pos);
        if (!this.cameraRig.transitioning) this.setState('PLAYING');
        break;

      case 'PAUSED':
        if (this.input.justPressed('pause')) this.resume();
        break;

      default:
        break;
    }
  }
}
