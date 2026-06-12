import * as THREE from 'three';
import { BossBase } from './BossBase.js';
import { EnemyBolt } from '../projectiles/EnemyBolt.js';

const CFG = {
  model: 'skeleton_mage',
  hp: 9,
  speed: 0,
  radius: 0.6,
  scale: 1.35,
  aggroRange: 30,
  attackRange: 0,
  touchDamage: 1,
};

// Boss 2 — The Crypt Eye.
// Teleporting caster: appears at an anchor, fires a 3-bolt fan, then opens a
// vulnerability window, then teleports to the next anchor and repeats.
// Only hurt by arrows (always) or sword/anything during the open window / stun.
export class Boss2Eye extends BossBase {
  constructor(game, x, z) {
    super(game, x, z, CFG);
    this.homeX = x;
    this.homeZ = z;

    // The four teleport anchors (home + 3 offset variants)
    this._anchors = [
      { x: x, z: z },
      { x: x + 3.2, z: z + 2.2 },
      { x: x - 3.2, z: z + 2.2 },
      { x: x + 3.2, z: z - 2.2 },
      { x: x - 3.2, z: z - 2.2 },
    ];
    this._anchorIdx = 0;

    this.vulnerable = false;
    this._stunned = false;
    this._deniedTimer = 0; // rate-limit sfx 'denied'

    // Start invisible until the first teleport-in
    this.mesh.visible = false;
    this.setState('tp_out', 'Idle');
  }

  // ── Teleport helpers ─────────────────────────────────────────────────────

  _nextAnchor() {
    const col = this.game.world.collision;
    for (let i = 1; i < this._anchors.length; i++) {
      const idx = (this._anchorIdx + i) % this._anchors.length;
      if (!col.circleHitsSolid(this._anchors[idx].x, this._anchors[idx].z, this.radius)) {
        this._anchorIdx = idx;
        return this._anchors[idx];
      }
    }
    // All blocked — fall back to home
    this._anchorIdx = 0;
    return this._anchors[0];
  }

  _teleportTo(anchor) {
    this.pos.x = anchor.x;
    this.pos.z = anchor.z;
    this.iframes = Math.max(this.iframes, 0.5);
    this.mesh.visible = true;
    this.syncMesh();
  }

  // ── Fan-shot ─────────────────────────────────────────────────────────────

  _fireFan() {
    const p = this.player;
    if (!p?.alive) return;
    const dx = p.x - this.x;
    const dz = p.z - this.z;
    const baseAngle = Math.atan2(dx, dz);
    const spread = 0.35; // rad
    for (let i = -1; i <= 1; i++) {
      const ang = baseAngle + i * spread;
      const bx = Math.sin(ang);
      const bz = Math.cos(ang);
      this.game.world.addEntity(
        new EnemyBolt(this.game, this, this.x, this.z, bx, bz, {
          speed: 6,
          damage: 1,
        })
      );
    }
    this.game.events.emit('sfx', 'magic');
  }

  // ── State machine ─────────────────────────────────────────────────────────

  _think(dt) {
    if (!this.player?.alive) return;

    this._deniedTimer = Math.max(0, this._deniedTimer - dt);

    switch (this.state) {
      // Brief delay before first appearance
      case 'tp_out':
        if (this.stateTime > 0.4) {
          this._doTeleportIn();
        }
        break;

      // Teleport-in flash, play appear anim, then shoot
      case 'tp_in':
        if (this.stateTime > 0.6) {
          this._fireFan();
          this.setState('shoot', 'Spellcast_Shoot', { once: true, duration: 0.7 });
        }
        break;

      // Wait for shoot anim, then open vulnerability
      case 'shoot':
        if (this.stateTime > 0.7) {
          this.vulnerable = true;
          this.setState('open', 'Spellcasting');
        }
        break;

      // Vulnerability window (~2.2s)
      case 'open':
        if (this.stateTime > 2.2) {
          this.vulnerable = false;
          this._beginTeleportOut();
        }
        break;

      // Teleport away
      case 'leaving':
        if (this.stateTime > 0.3) {
          this.mesh.visible = false;
          this.setState('tp_out', 'Idle');
        }
        break;

      // Stunned by arrow hit — stand still until stun expires
      case 'stunned':
        if (!this._stunned) {
          // stun was cleared externally (shouldn't happen, just guard)
          this._resumeFromStun();
        } else if (this.stateTime > 3.0) {
          this._stunned = false;
          this.vulnerable = false;
          this._resumeFromStun();
        }
        break;
    }
  }

  _doTeleportIn() {
    const anchor = this._nextAnchor();
    this._teleportTo(anchor);
    this.game.events.emit('sfx', 'teleport');
    this.setState('tp_in', 'Spellcast_Summon', { once: true, duration: 0.6 });
  }

  _beginTeleportOut() {
    this.setState('leaving', 'Spellcast_Summon', { once: true, duration: 0.3 });
  }

  _resumeFromStun() {
    this._beginTeleportOut();
  }

  // ── Hit handling ──────────────────────────────────────────────────────────

  takeHit(hit) {
    if (!this.alive) return false;

    const isArrow = hit.kind === 'arrow';
    const isStunned = this.state === 'stunned';
    const canHit = isArrow || isStunned || this.vulnerable;

    if (!canHit) {
      // Rate-limited deny sound (at most twice/second)
      if (this._deniedTimer <= 0) {
        this.game.events.emit('sfx', 'denied');
        this._deniedTimer = 0.5;
      }
      return false;
    }

    if (isArrow && !isStunned) {
      // Arrow → stun regardless of vulnerability window
      const accepted = super.takeHit(hit);
      if (accepted && this.alive) {
        this._stun();
      }
      return accepted;
    }

    // Normal accepted hit (vulnerable window or already stunned)
    return super.takeHit(hit);
  }

  _stun() {
    this._stunned = true;
    this.vulnerable = true; // remain vulnerable while stunned
    this.game.events.emit('sfx', 'secret');
    this.mesh.visible = true;
    // Hit_A once, then idle
    this.setState('stunned', 'Hit_A', {
      once: true,
      duration: 0.5,
      onDone: () => {
        if (this.state === 'stunned') {
          this.anim.play('Idle');
        }
      },
    });
  }
}
