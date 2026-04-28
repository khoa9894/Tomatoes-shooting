import { Command } from "@colyseus/command";
import { Client } from "colyseus";
import { GameRoom, GameRoomConfig } from "../GameRoom";

export class CmdStartMove extends Command<
  GameRoom,
  { client: Client; direction: number }
> {
  validate(payload: any): boolean {
    return payload.direction === 1 || payload.direction === -1;
  }
  execute(payload: any) {
    const player = this.state.players.find(
      (p) => p.sessionId == payload.client.sessionId,
    );
    player.faceDirection = payload.direction;
    player.isMoving = true;
  }
}

export class CmdStopMove extends Command<GameRoom, { client: Client }> {
  execute(payload: any) {
    const player = this.state.players.find(
      (p) => p.sessionId == payload.client.sessionId,
    );
    player.isMoving = false;
  }
}

export class CmdFire extends Command<
  GameRoom,
  { client: Client; degAngle: number; powerRatio: number }
> {
  validate(payload: any): boolean {
    if (isNaN(payload.powerRatio) || isNaN(payload.degAngle)) return false;
    const player = this.state.players.find(
      (p) => p.sessionId == payload.client.sessionId,
    );
    if (!player || player.fireCooldown > 0) return false;
    return player.projectiles.some((p) => !p.active);
  }

  execute(payload: any) {
    let degAngle = payload.degAngle;
    if (degAngle < 0) degAngle += 180;

    const player = this.state.players.find(
      (p) => p.sessionId == payload.client.sessionId,
    );
    const slot = player.projectiles.find((p) => !p.active);
    const radAngle = (Math.PI * degAngle) / 180;
    slot.active = true;
    slot.hasHit = false;
    slot.x = player.x;
    slot.y = 0;
    slot.vx =
      Math.cos(radAngle) * payload.powerRatio * GameRoomConfig.POWER_BASE;
    slot.vy =
      Math.sin(radAngle) * payload.powerRatio * GameRoomConfig.POWER_BASE;
    slot.landTimer = 0;
    player.fireCooldown = GameRoomConfig.FIRE_COOLDOWN;
  }
}
