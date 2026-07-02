import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Preloads every GLTF in the manifest before the game starts, so map loads
// and enemy spawns later are synchronous and instant.
const MODELS = {
  // characters
  hero: './assets/models/characters/hero.glb',
  mage: './assets/models/characters/mage.glb',
  rogue: './assets/models/characters/rogue.glb',
  barbarian: './assets/models/characters/barbarian.glb',
  skeleton_minion: './assets/models/enemies/skeleton_minion.glb',
  skeleton_rogue: './assets/models/enemies/skeleton_rogue.glb',
  skeleton_mage: './assets/models/enemies/skeleton_mage.glb',
  skeleton_warrior: './assets/models/enemies/skeleton_warrior.glb',
  // dungeon set
  floor_tile_large: './assets/models/dungeon/floor_tile_large.glb',
  floor_tile_small: './assets/models/dungeon/floor_tile_small.glb',
  floor_tile_small_broken_A: './assets/models/dungeon/floor_tile_small_broken_A.glb',
  floor_tile_small_broken_B: './assets/models/dungeon/floor_tile_small_broken_B.glb',
  floor_tile_small_decorated: './assets/models/dungeon/floor_tile_small_decorated.glb',
  floor_tile_small_weeds_A: './assets/models/dungeon/floor_tile_small_weeds_A.glb',
  floor_tile_small_weeds_B: './assets/models/dungeon/floor_tile_small_weeds_B.glb',
  floor_dirt_small_A: './assets/models/dungeon/floor_dirt_small_A.glb',
  floor_dirt_small_B: './assets/models/dungeon/floor_dirt_small_B.glb',
  floor_wood_large: './assets/models/dungeon/floor_wood_large.glb',
  wall: './assets/models/dungeon/wall.glb',
  wall_corner: './assets/models/dungeon/wall_corner.glb',
  wall_corner_small: './assets/models/dungeon/wall_corner_small.glb',
  wall_endcap: './assets/models/dungeon/wall_endcap.glb',
  wall_cracked: './assets/models/dungeon/wall_cracked.glb',
  wall_broken: './assets/models/dungeon/wall_broken.glb',
  wall_pillar: './assets/models/dungeon/wall_pillar.glb',
  wall_half: './assets/models/dungeon/wall_half.glb',
  wall_doorway: './assets/models/dungeon/wall_doorway.glb',
  pillar: './assets/models/dungeon/pillar.glb',
  column: './assets/models/dungeon/column.glb',
  torch_lit: './assets/models/dungeon/torch_lit.glb',
  torch_mounted: './assets/models/dungeon/torch_mounted.glb',
  banner_red: './assets/models/dungeon/banner_patternA_red.glb',
  banner_green: './assets/models/dungeon/banner_patternA_green.glb',
  banner_blue: './assets/models/dungeon/banner_patternA_blue.glb',
  barrel_small: './assets/models/dungeon/barrel_small.glb',
  barrel_large: './assets/models/dungeon/barrel_large.glb',
  crates_stacked: './assets/models/dungeon/crates_stacked.glb',
  box_small: './assets/models/dungeon/box_small.glb',
  rubble_half: './assets/models/dungeon/rubble_half.glb',
  rubble_large: './assets/models/dungeon/rubble_large.glb',
  chest: './assets/models/dungeon/chest.glb',
  chest_gold: './assets/models/dungeon/chest_gold.glb',
  key: './assets/models/dungeon/key.glb',
  coin: './assets/models/dungeon/coin.glb',
  stairs_wide: './assets/models/dungeon/stairs_wide.glb',
  table_medium: './assets/models/dungeon/table_medium.glb',
  chair: './assets/models/dungeon/chair.glb',
  shelf_small: './assets/models/dungeon/shelf_small.glb',
  bed_decorated: './assets/models/dungeon/bed_decorated.glb',
  keg: './assets/models/dungeon/keg.glb',
  spikes: './assets/models/dungeon/floor_tile_big_spikes.glb',
  sword_shield: './assets/models/dungeon/sword_shield.glb',
  candle_lit: './assets/models/dungeon/candle_lit.glb',
};

const cache = new Map();

export const Assets = {
  async preload(onProgress = () => {}) {
    const loader = new GLTFLoader();
    const names = Object.keys(MODELS);
    let done = 0;
    await Promise.all(names.map(async (name) => {
      const gltf = await loader.loadAsync(MODELS[name]);
      cache.set(name, gltf);
      done++;
      onProgress(done / names.length, name);
    }));
  },

  // Returns the raw cached GLTF { scene, animations }. Callers must clone
  // (SkeletonUtils.clone for skinned models) before adding to a scene.
  get(name) {
    const gltf = cache.get(name);
    if (!gltf) throw new Error(`Asset not preloaded: ${name}`);
    return gltf;
  },

  has(name) {
    return cache.has(name);
  },
};
