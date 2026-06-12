import { TILE } from '../data/balance.js';

// Dungeon room logic: tracks which room rect contains the player, drives the
// camera lock + Zelda slide transitions, seals 'shut' doors while a room has
// living enemies, and opens them on room_clear.
export class RoomManager {
  constructor(game) {
    this.game = game;
    this.currentRoom = null;
    game.events.on('enemy-died', () => this.checkRoomClear());
  }

  reset() {
    this.currentRoom = null;
  }

  roomAt(x, z) {
    const rooms = this.game.world.mapDef?.rooms;
    if (!rooms) return null;
    const c = Math.floor(x / TILE);
    const r = Math.floor(z / TILE);
    return rooms.find((rm) => c >= rm.x && c < rm.x + rm.w && r >= rm.y && r < rm.y + rm.h) ?? null;
  }

  roomRect(room) {
    // world-space rect the camera target may roam in; CameraRig clamps the
    // view, and small rooms simply center.
    const pad = TILE * 1.2;
    return {
      minX: room.x * TILE + pad,
      maxX: (room.x + room.w) * TILE - pad,
      minZ: room.y * TILE + pad,
      maxZ: (room.y + room.h) * TILE - pad,
    };
  }

  enemiesInRoom(roomId) {
    return this.game.world.entities.filter(
      (e) => e.roomId === roomId && e.alive && !e.removed && e.friendly === false
    );
  }

  // Called every PLAYING frame (cheap: a rect lookup).
  update() {
    const world = this.game.world;
    if (!world.mapDef?.rooms) return;
    const p = this.game.player;
    const room = this.roomAt(p.x, p.z);
    if (!room || room.id === this.currentRoom?.id) return;

    const isFirst = this.currentRoom === null;
    this.currentRoom = room;
    world.activeRoomId = room.id;
    this.game.cameraRig.setRoom(this.roomRect(room), isFirst);
    if (!isFirst) {
      this.game.cameraRig.startRoomTransition();
      this.game.setState('TRANSITION');
    }
    this.game.events.emit('room-entered', room.id);
    this._sealIfHostile(room);
  }

  _sealIfHostile(room) {
    const hostiles = this.enemiesInRoom(room.id);
    for (const door of this._shutDoors(room)) {
      if (door.def.openWhen === 'room_clear') {
        door.setOpen(hostiles.length === 0, { sfx: hostiles.length > 0 });
      }
    }
    const boss = hostiles.find((e) => e.isBoss);
    if (boss) {
      this.game.events.emit('boss-bar', { show: true, hp: boss.hp, maxHp: boss.maxHp });
      this.game.events.emit('music', 'boss');
    } else {
      this.game.events.emit('boss-bar', { show: false });
    }
  }

  _shutDoors(room) {
    return this.game.world.entities.filter(
      (e) => e.def?.type === 'shut'
        && e.def.x >= room.x - 1 && e.def.x <= room.x + room.w
        && e.def.y >= room.y - 1 && e.def.y <= room.y + room.h
    );
  }

  checkRoomClear() {
    const room = this.currentRoom;
    if (!room) return;
    if (this.enemiesInRoom(room.id).length > 0) return;
    for (const door of this._shutDoors(room)) {
      if (door.def.openWhen === 'room_clear') door.setOpen(true);
    }
    this.game.events.emit('boss-bar', { show: false });
    this.game.events.emit('sfx', 'secret');
  }
}
