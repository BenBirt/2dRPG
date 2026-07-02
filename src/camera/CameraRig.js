import * as THREE from 'three';
import { CAMERA, TILE } from '../data/balance.js';

// Tilted top-down camera. Two modes:
//   follow — smooth-follow the player, clamped to map bounds (overworld)
//   room   — target clamped inside the active room rect, with a tweened
//            slide between rooms (dungeons)
export class CameraRig {
  constructor(aspect) {
    this.camera = new THREE.PerspectiveCamera(CAMERA.fov, aspect, 0.5, 120);
    this.offset = new THREE.Vector3(CAMERA.offset.x, CAMERA.offset.y, CAMERA.offset.z);
    this.target = new THREE.Vector3();
    this.mode = 'follow';
    this.bounds = null; // {minX, maxX, minZ, maxZ} clamp for the target point
    this.room = null;
    this.transition = null; // { from, to, t }
    this.shake = 0;
    this._applyOffset();
  }

  setAspect(aspect) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  setMapBounds(cols, rows) {
    // keep the view inside the map with a small margin
    const margin = TILE * 2.2;
    this.bounds = {
      minX: margin, maxX: cols * TILE - margin,
      minZ: margin, maxZ: rows * TILE - margin,
    };
  }

  setRoom(rect, instant = false) {
    this.room = rect; // {minX, maxX, minZ, maxZ} in world units
    if (instant) this.transition = null;
  }

  startRoomTransition() {
    this.transition = { t: 0 };
  }

  get transitioning() {
    return this.transition !== null;
  }

  _clampTarget(x, z, rect) {
    if (!rect) return { x, z };
    return {
      x: THREE.MathUtils.clamp(x, rect.minX, rect.maxX),
      z: THREE.MathUtils.clamp(z, rect.minZ, rect.maxZ),
    };
  }

  addShake(amount) {
    this.shake = Math.max(this.shake, amount);
  }

  update(dt, focus) {
    let desired;
    if (this.mode === 'room' && this.room) {
      desired = this._clampTarget(focus.x, focus.z, this.room);
    } else {
      desired = this._clampTarget(focus.x, focus.z, this.bounds);
    }

    const desiredY = focus.y || 0;
    if (this.transition) {
      this.transition.t += dt / CAMERA.transitionTime;
      const k = Math.min(this.transition.t, 1);
      const ease = k * k * (3 - 2 * k);
      this.target.x += (desired.x - this.target.x) * ease;
      this.target.z += (desired.z - this.target.z) * ease;
      this.target.y += (desiredY - this.target.y) * ease;
      if (k >= 1) this.transition = null;
    } else {
      const lerp = 1 - Math.exp(-(this.mode === 'room' ? CAMERA.roomLerp : CAMERA.followLerp) * dt);
      this.target.x += (desired.x - this.target.x) * lerp;
      this.target.z += (desired.z - this.target.z) * lerp;
      this.target.y += (desiredY - this.target.y) * lerp;
    }

    this._applyOffset();

    if (this.shake > 0.001) {
      this.camera.position.x += (Math.random() - 0.5) * this.shake;
      this.camera.position.z += (Math.random() - 0.5) * this.shake;
      this.shake *= Math.max(0, 1 - dt * 5);
    }
  }

  snapTo(focus) {
    const rect = this.mode === 'room' ? this.room : this.bounds;
    const t = this._clampTarget(focus.x, focus.z, rect);
    this.target.set(t.x, focus.y || 0, t.z);
    this.transition = null;
    this._applyOffset();
  }

  _applyOffset() {
    this.camera.position.copy(this.target).add(this.offset);
    this.camera.lookAt(this.target);
  }
}
