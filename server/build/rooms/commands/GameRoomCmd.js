"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CmdFire = exports.CmdStopMove = exports.CmdStartMove = void 0;
const command_1 = require("@colyseus/command");
const GameRoom_1 = require("../GameRoom");
class CmdStartMove extends command_1.Command {
    validate(payload) {
        return payload.direction === 1 || payload.direction === -1;
    }
    execute(payload) {
        const player = this.state.players.find(p => p.sessionId == payload.client.sessionId);
        player.faceDirection = payload.direction;
        player.isMoving = true;
    }
}
exports.CmdStartMove = CmdStartMove;
class CmdStopMove extends command_1.Command {
    execute(payload) {
        const player = this.state.players.find(p => p.sessionId == payload.client.sessionId);
        player.isMoving = false;
    }
}
exports.CmdStopMove = CmdStopMove;
class CmdFire extends command_1.Command {
    validate(payload) {
        if (isNaN(payload.powerRatio) || isNaN(payload.degAngle))
            return false;
        const player = this.state.players.find(p => p.sessionId == payload.client.sessionId);
        if (!player || player.fireCooldown > 0)
            return false;
        return player.projectiles.some(p => !p.active);
    }
    execute(payload) {
        let degAngle = payload.degAngle;
        if (degAngle < 0)
            degAngle += 180;
        const player = this.state.players.find(p => p.sessionId == payload.client.sessionId);
        const slot = player.projectiles.find(p => !p.active);
        const radAngle = (Math.PI * degAngle) / 180;
        slot.active = true;
        slot.x = player.x;
        slot.y = 0;
        slot.vx = Math.cos(radAngle) * payload.powerRatio * GameRoom_1.GameRoomConfig.POWER_BASE;
        slot.vy = Math.sin(radAngle) * payload.powerRatio * GameRoom_1.GameRoomConfig.POWER_BASE;
        slot.landTimer = 0;
        player.fireCooldown = GameRoom_1.GameRoomConfig.FIRE_COOLDOWN;
    }
}
exports.CmdFire = CmdFire;
