"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameRoomState = exports.PlayerState = exports.BubbleState = exports.Projectile = void 0;
const schema_1 = require("@colyseus/schema");
const GamePhases_1 = require("../GamePhases");
class Projectile extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.active = false;
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.landTimer = 0;
        this.hasHit = false; // true after hitting a bubble
    }
}
exports.Projectile = Projectile;
__decorate([
    (0, schema_1.type)("boolean")
], Projectile.prototype, "active", void 0);
__decorate([
    (0, schema_1.type)("number")
], Projectile.prototype, "x", void 0);
__decorate([
    (0, schema_1.type)("number")
], Projectile.prototype, "y", void 0);
__decorate([
    (0, schema_1.type)("number")
], Projectile.prototype, "vx", void 0);
__decorate([
    (0, schema_1.type)("number")
], Projectile.prototype, "vy", void 0);
__decorate([
    (0, schema_1.type)("number")
], Projectile.prototype, "landTimer", void 0);
__decorate([
    (0, schema_1.type)("boolean")
], Projectile.prototype, "hasHit", void 0);
class BubbleState extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.id = 0; // index in array
        this.text = ""; // displayed value (could be number or "?")
        this.value = 0; // actual numeric value for server comparison
        this.isCorrect = false;
        this.x = 0;
        this.y = 0;
        this.active = false;
    }
}
exports.BubbleState = BubbleState;
__decorate([
    (0, schema_1.type)("number")
], BubbleState.prototype, "id", void 0);
__decorate([
    (0, schema_1.type)("string")
], BubbleState.prototype, "text", void 0);
__decorate([
    (0, schema_1.type)("number")
], BubbleState.prototype, "value", void 0);
__decorate([
    (0, schema_1.type)("boolean")
], BubbleState.prototype, "isCorrect", void 0);
__decorate([
    (0, schema_1.type)("number")
], BubbleState.prototype, "x", void 0);
__decorate([
    (0, schema_1.type)("number")
], BubbleState.prototype, "y", void 0);
__decorate([
    (0, schema_1.type)("boolean")
], BubbleState.prototype, "active", void 0);
class PlayerState extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.sessionId = "";
        this.x = 0;
        this.faceDirection = 1;
        this.isMoving = false;
        this.projectiles = new schema_1.ArraySchema();
        this.fireCooldown = 0;
        this.score = 0;
    }
}
exports.PlayerState = PlayerState;
__decorate([
    (0, schema_1.type)("string")
], PlayerState.prototype, "sessionId", void 0);
__decorate([
    (0, schema_1.type)("number")
], PlayerState.prototype, "x", void 0);
__decorate([
    (0, schema_1.type)("number")
], PlayerState.prototype, "faceDirection", void 0);
__decorate([
    (0, schema_1.type)("boolean")
], PlayerState.prototype, "isMoving", void 0);
__decorate([
    (0, schema_1.type)([Projectile])
], PlayerState.prototype, "projectiles", void 0);
__decorate([
    (0, schema_1.type)("number")
], PlayerState.prototype, "fireCooldown", void 0);
__decorate([
    (0, schema_1.type)("number")
], PlayerState.prototype, "score", void 0);
class GameRoomState extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.phase = GamePhases_1.GamePhase.WAITING;
        this.players = new schema_1.ArraySchema();
        this.winner = "";
        this.question = ""; // e.g. "7 × 8 = ?"
        this.correctAnswer = 0;
        this.questionIndex = 0; // 0-4, total 5 rounds
        this.bubbles = new schema_1.ArraySchema();
    }
}
exports.GameRoomState = GameRoomState;
__decorate([
    (0, schema_1.type)("number")
], GameRoomState.prototype, "phase", void 0);
__decorate([
    (0, schema_1.type)([PlayerState])
], GameRoomState.prototype, "players", void 0);
__decorate([
    (0, schema_1.type)("string")
], GameRoomState.prototype, "winner", void 0);
__decorate([
    (0, schema_1.type)("string")
], GameRoomState.prototype, "question", void 0);
__decorate([
    (0, schema_1.type)("number")
], GameRoomState.prototype, "correctAnswer", void 0);
__decorate([
    (0, schema_1.type)("number")
], GameRoomState.prototype, "questionIndex", void 0);
__decorate([
    (0, schema_1.type)([BubbleState])
], GameRoomState.prototype, "bubbles", void 0);
