"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameRoom = exports.GameRoomConfig = void 0;
const command_1 = require("@colyseus/command");
const core_1 = require("@colyseus/core");
const GamePhases_1 = require("./GamePhases");
// Thêm phase mới vào GamePhase nếu chưa có trong GamePhases.ts
// Xóa enum GameRoomPhase, chỉ dùng GamePhase
const GameRoomCmd_1 = require("./commands/GameRoomCmd");
const GameRoomState_1 = require("./schema/GameRoomState");
exports.GameRoomConfig = {
    MOVE_SPEED: 250,
    FIELD_WIDTH: 1800,
    MAX_PLAYER: 2,
    GRAVITY: 1000,
    POWER_BASE: 2000,
    HIT_RADIUS: 80,
    FIRE_COOLDOWN: 0.3,
    POOL_SIZE: 6,
    LAND_LINGER: 1.5,
    BUBBLE_COUNT: 10,
    ROUNDS: 5,
};
const QUESTION_BANK = [
    // Cộng
    { text: "3 + 5 = ?", answer: 8 },
    { text: "7 + 6 = ?", answer: 13 },
    { text: "12 + 9 = ?", answer: 21 },
    { text: "24 + 17 = ?", answer: 41 },
    { text: "36 + 48 = ?", answer: 84 },
    { text: "55 + 27 = ?", answer: 82 },
    { text: "63 + 19 = ?", answer: 82 },
    // Trừ
    { text: "10 - 4 = ?", answer: 6 },
    { text: "15 - 8 = ?", answer: 7 },
    { text: "20 - 13 = ?", answer: 7 },
    { text: "34 - 17 = ?", answer: 17 },
    { text: "50 - 26 = ?", answer: 24 },
    { text: "72 - 38 = ?", answer: 34 },
    // Nhân
    { text: "3 × 4 = ?", answer: 12 },
    { text: "5 × 6 = ?", answer: 30 },
    { text: "7 × 8 = ?", answer: 56 },
    { text: "9 × 6 = ?", answer: 54 },
    { text: "4 × 8 = ?", answer: 32 },
    { text: "6 × 7 = ?", answer: 42 },
    { text: "8 × 9 = ?", answer: 72 },
    // Chia
    { text: "12 ÷ 3 = ?", answer: 4 },
    { text: "20 ÷ 4 = ?", answer: 5 },
    { text: "36 ÷ 6 = ?", answer: 6 },
    { text: "45 ÷ 9 = ?", answer: 5 },
    { text: "56 ÷ 7 = ?", answer: 8 },
    { text: "63 ÷ 9 = ?", answer: 7 },
    { text: "48 ÷ 8 = ?", answer: 6 },
];
function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function generateWrongAnswers(correct, count) {
    const wrongs = new Set();
    while (wrongs.size < count) {
        const delta = randInt(1, 12) * (Math.random() < 0.5 ? 1 : -1);
        const w = correct + delta;
        if (w !== correct && w > 0)
            wrongs.add(w);
    }
    return Array.from(wrongs);
}
// Shuffle and pick ROUNDS questions from the bank each game
function pickQuestions(count) {
    const shuffled = [...QUESTION_BANK].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}
class GameRoom extends core_1.Room {
    constructor() {
        super(...arguments);
        this.dispatcher = new command_1.Dispatcher(this);
        this.questionQueue = [];
    }
    onCreate(options) {
        this.maxClients = exports.GameRoomConfig.MAX_PLAYER;
        this.setPatchRate(16);
        this.setState(new GameRoomState_1.GameRoomState());
        // pre-allocate bubble pool
        for (let i = 0; i < exports.GameRoomConfig.BUBBLE_COUNT; i++) {
            const b = new GameRoomState_1.BubbleState();
            b.id = i;
            this.state.bubbles.push(b);
        }
        this.onMessage("start-move", this.handleStartMoveMsg.bind(this));
        this.onMessage("stop-move", this.handleStopMoveMsg.bind(this));
        this.onMessage("fire", this.handleFireMsg.bind(this));
        // Nhận message từ client báo đã tween xong
        this.onMessage("bubbles-cleared", this.handleBubblesCleared.bind(this));
        this.setSimulationInterval(this.update.bind(this));
    }
    onJoin(client, options) {
        console.log(client.sessionId, "joined!");
        const spawnX = this.state.players.length === 0 ? -400 : 400;
        const newPlayer = new GameRoomState_1.PlayerState().assign({
            sessionId: client.sessionId,
            x: spawnX,
            faceDirection: this.state.players.length === 0 ? 1 : -1,
            isMoving: false,
            score: 0,
        });
        this.state.players.push(newPlayer);
        for (let i = 0; i < exports.GameRoomConfig.POOL_SIZE; i++) {
            newPlayer.projectiles.push(new GameRoomState_1.Projectile());
        }
        if (this.hasReachedMaxClients()) {
            this.lock();
            this.questionQueue = pickQuestions(exports.GameRoomConfig.ROUNDS);
            this.state.phase = GamePhases_1.GamePhase.INGAME;
            this.spawnQuestion();
        }
    }
    onLeave(client, consented) {
        for (let c of this.clients) {
            if (c.sessionId != client.sessionId) {
                this.state.winner = c.sessionId;
                break;
            }
        }
        this.state.phase = GamePhases_1.GamePhase.ENDED;
    }
    handleStartMoveMsg(client, msg) {
        this.dispatcher.dispatch(new GameRoomCmd_1.CmdStartMove(), {
            client,
            direction: msg.direction,
        });
    }
    handleStopMoveMsg(client, msg) {
        this.dispatcher.dispatch(new GameRoomCmd_1.CmdStopMove(), { client });
    }
    handleFireMsg(client, msg) {
        this.dispatcher.dispatch(new GameRoomCmd_1.CmdFire(), {
            client,
            degAngle: msg.angle,
            powerRatio: msg.powerRatio,
        });
    }
    spawnQuestion() {
        const q = this.questionQueue[this.state.questionIndex];
        if (!q)
            return;
        this.state.question = q.text;
        this.state.correctAnswer = q.answer;
        // build answer pool: 1 correct + 9 wrong, shuffled
        const wrongs = generateWrongAnswers(q.answer, exports.GameRoomConfig.BUBBLE_COUNT - 1);
        const allAnswers = [q.answer, ...wrongs].sort(() => Math.random() - 0.5);
        // positions spread across screen: x in [-800, 800], y in [50, 400]
        allAnswers.forEach((val, i) => {
            const col = i % 5;
            const row = Math.floor(i / 5);
            const b = this.state.bubbles[i];
            b.value = val;
            b.text = String(val);
            b.isCorrect = val === q.answer;
            b.x = -800 + col * 400 + randInt(-60, 60);
            b.y = 150 + row * 220 + randInt(-30, 30);
            b.active = true;
        });
    }
    // Returns true if a bubble was hit (projectile should stop)
    checkBubbleHit(proj, shooterSessionId) {
        if (proj.hasHit)
            return true; // already used
        for (const b of this.state.bubbles) {
            if (!b.active)
                continue;
            const dist = Math.sqrt((proj.x - b.x) ** 2 + (proj.y - b.y) ** 2);
            if (dist <= 65) {
                b.active = false; // bubble disappears immediately
                proj.hasHit = true; // mark projectile as spent
                proj.active = false; // remove projectile immediately
                if (b.isCorrect) {
                    const player = this.state.players.find((p) => p.sessionId === shooterSessionId);
                    if (player)
                        player.score += 1;
                    this.state.questionIndex += 1;
                    if (this.state.questionIndex >= exports.GameRoomConfig.ROUNDS) {
                        this.endGame();
                    }
                    else {
                        // Đổi phase, chờ client tween bubble về 0
                        this.state.phase = GamePhases_1.GamePhase.WAITING_FOR_BUBBLE_CLEAR;
                        // Không gọi spawnQuestion ở đây
                    }
                }
                return true;
            }
        }
        return false;
    }
    endGame() {
        const p0 = this.state.players[0];
        const p1 = this.state.players[1];
        if (!p0 || !p1)
            return;
        if (p0.score > p1.score)
            this.state.winner = p0.sessionId;
        else if (p1.score > p0.score)
            this.state.winner = p1.sessionId;
        // else draw (winner stays empty)
        this.state.phase = p0.score === p1.score ? GamePhases_1.GamePhase.DRAW : GamePhases_1.GamePhase.ENDED;
    }
    // Khi client báo tween xong thì spawn câu hỏi mới
    handleBubblesCleared(client, msg) {
        if (this.state.phase === GamePhases_1.GamePhase.WAITING_FOR_BUBBLE_CLEAR) {
            this.state.phase = GamePhases_1.GamePhase.INGAME;
            this.spawnQuestion();
        }
    }
    update(msDt) {
        const secDt = msDt / 1000;
        if (this.state.phase !== GamePhases_1.GamePhase.INGAME)
            return;
        this.state.players.forEach((player) => {
            if (player.isMoving) {
                player.x += exports.GameRoomConfig.MOVE_SPEED * player.faceDirection * secDt;
            }
            if (player.fireCooldown > 0) {
                player.fireCooldown = Math.max(0, player.fireCooldown - secDt);
            }
            player.projectiles.forEach((proj) => {
                if (!proj.active)
                    return;
                if (proj.landTimer > 0) {
                    proj.landTimer = Math.max(0, proj.landTimer - secDt);
                    if (proj.landTimer === 0)
                        proj.active = false;
                    return;
                }
                proj.x += proj.vx * secDt;
                proj.y += proj.vy * secDt;
                proj.vy -= exports.GameRoomConfig.GRAVITY * secDt;
                // check bubble hit while flying
                const hit = this.checkBubbleHit(proj, player.sessionId);
                if (hit)
                    return; // projectile already deactivated
                if (proj.y < 0) {
                    proj.y = 0;
                    proj.vx = 0;
                    proj.vy = 0;
                    proj.landTimer = exports.GameRoomConfig.LAND_LINGER;
                }
            });
        });
    }
}
exports.GameRoom = GameRoom;
