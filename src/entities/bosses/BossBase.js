import { Enemy } from '../enemies/Enemy.js';

// Shared boss behavior: HUD hp bar updates, death → flag + heart container +
// room clear. Subclasses implement _think() phases.
export class BossBase extends Enemy {
  constructor(game, x, z, cfg) {
    super(game, x, z, cfg);
    this.isBoss = true;
    this.spawned = true; // bosses skip the generic awaken state
    this.setState('idle', 'Idle');
  }

  takeHit(hit) {
    const accepted = super.takeHit(hit);
    if (accepted) {
      this.game.events.emit('boss-bar', { show: this.alive, hp: this.hp, maxHp: this.maxHp });
    }
    return accepted;
  }

  onHurt() {
    // bosses don't flinch-stagger like trash mobs; just flash (iframes blink)
    this.game.events.emit('sfx', 'enemy_hurt');
  }

  die() {
    this.alive = false;
    this.hittable = false;
    this.setState('dead', 'Death_A', { once: true });
    this.deathTime = -1.2; // linger a little longer than trash
    this.game.events.emit('sfx', 'boss_die');
    this.game.events.emit('boss-bar', { show: false });
    this.game.cameraRig.addShake(0.4);
    const mapId = this.game.world.mapDef.id;
    this.game.setFlag(`${mapId}_boss_dead`);
    this.game.events.emit('enemy-died', this);
    this.onBossDeath();
  }

  // default reward: a heart container where the boss fell (persisted so it
  // can't be re-farmed by reloading the map before collecting it)
  onBossDeath() {
    const mapId = this.game.world.mapDef.id;
    this.game.spawnPickup(this.x, this.z, 'heart_container', {
      persist: `${mapId}_heartc`,
    });
  }
}
