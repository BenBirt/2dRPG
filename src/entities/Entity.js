import * as THREE from 'three';

// Crossfading animation helper shared by every skinned character.
export class AnimController {
  constructor(root, clips) {
    this.mixer = new THREE.AnimationMixer(root);
    this.actions = new Map();
    for (const clip of clips) {
      this.actions.set(clip.name, this.mixer.clipAction(clip));
    }
    this.current = null;
    this.onDone = null;
    this.mixer.addEventListener('finished', () => {
      const cb = this.onDone;
      this.onDone = null;
      if (cb) cb();
    });
  }

  has(name) {
    return this.actions.has(name);
  }

  // play(name, { fade, once, timeScale, onDone }) — duration: if given, the
  // clip's timeScale is set so it finishes in exactly `duration` seconds.
  play(name, { fade = 0.12, once = false, timeScale, duration, onDone = null } = {}) {
    const action = this.actions.get(name);
    if (!action) return null;
    if (this.current === action && !once) return action;

    if (duration) timeScale = action.getClip().duration / duration;
    action.reset();
    action.timeScale = timeScale ?? 1;
    if (once) {
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      this.onDone = onDone;
    } else {
      action.setLoop(THREE.LoopRepeat, Infinity);
    }
    if (this.current && this.current !== action) {
      action.crossFadeFrom(this.current, fade, false);
    }
    action.play();
    this.current = action;
    return action;
  }

  update(dt) {
    this.mixer.update(dt);
  }
}

let nextId = 1;

export class Entity {
  constructor(game, x, z) {
    this.game = game;
    this.id = `e${nextId++}`;
    this.pos = new THREE.Vector3(x, 0, z);
    this.facing = 0; // radians, 0 = +z (south)
    this.radius = 0.4;
    this.hp = 1;
    this.maxHp = 1;
    this.alive = true;
    this.removed = false;
    this.roomId = null;
    this.mesh = null; // THREE.Object3D root, positioned from this.pos
    this.anim = null;
    this.iframes = 0;
    this.knock = new THREE.Vector2(0, 0);
    this.hittable = false; // participates in combat queries
    this.friendly = null; // true = player side, false = enemy, null = neutral
    this.blocksPlayer = false;
  }

  get x() { return this.pos.x; }
  get z() { return this.pos.z; }

  syncMesh() {
    if (!this.mesh) return;
    this.mesh.position.set(this.pos.x, this.pos.y, this.pos.z);
    this.mesh.rotation.y = this.facing;
  }

  faceToward(dx, dz, dt, rate = 14) {
    const target = Math.atan2(dx, dz);
    let diff = target - this.facing;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const max = rate * dt;
    this.facing += THREE.MathUtils.clamp(diff, -max, max);
  }

  facingVec() {
    return { x: Math.sin(this.facing), z: Math.cos(this.facing) };
  }

  distanceTo(other) {
    return Math.hypot(other.x - this.x, other.z - this.z);
  }

  // Applies decaying knockback through collision; call from update().
  applyKnockback(dt, collision) {
    if (this.knock.lengthSq() < 0.01) return;
    const res = collision.moveCircle(
      this.pos.x, this.pos.z, this.radius,
      this.knock.x * dt, this.knock.y * dt
    );
    this.pos.x = res.x;
    this.pos.z = res.z;
    this.knock.multiplyScalar(Math.max(0, 1 - dt * 8));
  }

  takeHit(hit) {
    if (!this.alive || this.iframes > 0) return false;
    this.hp -= hit.damage;
    this.iframes = hit.iframes ?? 0.4;
    if (hit.knockX || hit.knockZ) {
      this.knock.set(hit.knockX || 0, hit.knockZ || 0);
    }
    if (this.hp <= 0) {
      this.hp = 0;
      this.die(hit);
    } else {
      this.onHurt(hit);
    }
    return true;
  }

  onHurt() {}
  die() { this.alive = false; }

  update(dt) {
    this.iframes = Math.max(0, this.iframes - dt);
    this.anim?.update(dt);
  }

  // Hurt feedback: blink the mesh while invulnerable.
  updateBlink() {
    if (!this.mesh) return;
    const visible = this.iframes <= 0 || Math.floor(this.iframes * 12) % 2 === 0;
    this.mesh.visible = visible;
  }

  dispose() {}
}
