import { ArraySchema, Schema, type } from "@colyseus/schema";
import { GamePhase } from "../GamePhases";

export class Projectile extends Schema {
  @type("boolean") active: boolean = false;
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") vx: number = 0;
  @type("number") vy: number = 0;
  @type("number") landTimer: number = 0;
  @type("boolean") hasHit: boolean = false; // true after hitting a bubble
}

export class BubbleState extends Schema {
  @type("number") id: number = 0; // index in array
  @type("string") text: string = ""; // displayed value (could be number or "?")
  @type("number") value: number = 0; // actual numeric value for server comparison
  @type("boolean") isCorrect: boolean = false;
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("boolean") active: boolean = false;
}

export class PlayerState extends Schema {
  @type("string") sessionId: string = "";
  @type("number") x: number = 0;
  @type("number") faceDirection: number = 1;
  @type("boolean") isMoving: boolean = false;
  @type([Projectile]) projectiles: ArraySchema<Projectile> =
    new ArraySchema<Projectile>();
  @type("number") fireCooldown: number = 0;
  @type("number") score: number = 0;
}

export class GameRoomState extends Schema {
  @type("number") phase: GamePhase = GamePhase.WAITING;
  @type([PlayerState]) players: ArraySchema<PlayerState> =
    new ArraySchema<PlayerState>();
  @type("string") winner: string = "";
  @type("string") question: string = ""; // e.g. "7 × 8 = ?"
  @type("number") correctAnswer: number = 0;
  @type("number") questionIndex: number = 0; // 0-4, total 5 rounds
  @type([BubbleState]) bubbles: ArraySchema<BubbleState> =
    new ArraySchema<BubbleState>();
}
