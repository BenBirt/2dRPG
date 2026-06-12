import * as THREE from 'three';
import { Loop } from './Loop.js';
import { Events } from './Events.js';
import { Input } from '../input/Input.js';
import { Keyboard } from '../input/Keyboard.js';
import { World } from '../world/World.js';
import { CameraRig } from '../camera/CameraRig.js';
import { Player } from '../entities/Player.js';
import { PLAYER } from '../data/balance.js';
import { MAPS } from '../data/maps/index.js';

// Fresh-game progress: the single source of truth for everything the save
// system persists. Flags is a Set of stable string ids from map data.
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
    this.state = 'TITLE'; // TITLE/INTRO/PLAYING/DIALOG/TRANSITION/PAUSED/GAMEOVER/VICTORY/SCRIPTED

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
    this.keyboard = new Keyboard(this.input);
    this.input.addSource(this.keyboard);

    this.world = new World(this);
    this.player = null;
    this.progress = newProgress();

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
  }

  // Loads a map and places the player at the given spawn.
  enterMap(mapId, spawnId) {
    const mapDef = MAPS[mapId];
    if (!mapDef) throw new Error(`Unknown map: ${mapId}`);
    this.world.load(mapDef);
    this.cameraRig.setMapBounds(this.world.cols, this.world.rows);
    this.cameraRig.mode = mapDef.rooms?.length ? 'room' : 'follow';

    const spawn = this.world.spawnPoint(spawnId);
    if (!this.player) {
      this.player = new Player(this, spawn.x, spawn.z);
    } else {
      this.player.pos.set(spawn.x, 0, spawn.z);
      this.player.knock.set(0, 0);
    }
    if (spawn.dir !== undefined) this.player.facing = spawn.dir;
    this.world.addEntity(this.player);
    this.progress.location = { map: mapId, spawn: spawnId };

    this.cameraRig.setRoom(null, true);
    this.cameraRig.snapTo(this.player.pos);
    this.events.emit('map-entered', mapId);
  }

  setState(state) {
    const prev = this.state;
    this.state = state;
    this.events.emit('state-changed', { prev, state });
  }

  update(dt) {
    this.input.update();

    switch (this.state) {
      case 'PLAYING':
        this.world.update(dt);
        this.cameraRig.update(dt, this.player.pos);
        break;
      case 'TRANSITION':
        this.cameraRig.update(dt, this.player.pos);
        if (!this.cameraRig.transitioning) this.setState('PLAYING');
        break;
      default:
        break;
    }
  }
}
