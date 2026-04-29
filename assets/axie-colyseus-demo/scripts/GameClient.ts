import {
  _decorator,
  Color,
  Component,
  director,
  easing,
  EventKeyboard,
  Graphics,
  Input,
  input,
  instantiate,
  KeyCode,
  Label,
  Node,
  Prefab,
  ProgressBar,
  sp,
  tween,
  UIOpacity,
} from "cc";
import Colyseus from "db://colyseus-sdk/colyseus.js";
import { GamePhase } from "./GamePhases";
import { Bubble } from "../../prefabs/Bubble";
import { ChallengeFriendCompleteScreen } from "../../challenge-friend-complete-screen/ChallengeFriendCompleteScreen";
const { ccclass, property } = _decorator;

@ccclass("GameClient")
export class GameClient extends Component {
  @property hostname = "tomatoes-shooting.onrender.com"!;
  @property port = 443!;
  @property useSSL = true!;
  @property gameRoom: string = "game_room"!;

  @property(Node) projectileTemplate: Node = null!;
  @property(Node) projectileContainer: Node = null!;
  @property([sp.Skeleton]) axieSpines: sp.Skeleton[] = []!;
  @property(Label) labelQuestion: Label = null!; // replaces labelCountdown
  @property(Label) playerCountdown: Label = null!;
  @property(Label) opponentCountdown: Label = null!;
  @property(Node) header: Node = null!;
  @property(ProgressBar) pbPowerRatio: ProgressBar = null!;
  @property(Node) meIndicator: Node = null!;
  @property(Node) oppIndicator: Node = null!;
  @property speedStakePower: number = 0.2!;
  @property(ChallengeFriendCompleteScreen)
  panelEnd: ChallengeFriendCompleteScreen = null!;
  @property(Prefab) bubblePrefab: Prefab = null!;
  @property(Node) bubbleContainer: Node = null!;
  @property(Label) waitingLabel: Label = null!;
  @property(UIOpacity) allNode: UIOpacity = null!;
  @property(UIOpacity) gameNode: UIOpacity = null!;

  client: Colyseus.Client = null;
  room: Colyseus.Room = null;

  // [playerIndex][poolIndex] -> Node
  private projectilePool: Node[][] = [];
  // bubble pool [id] -> Node
  private bubbleNodes: Node[] = [];

  powerRatio: number = 0;
  isStakingPower: boolean = false;
  myFaceDirection: number = 1;
  myIndex: number = 1;

  private _trajectoryGraphics: Graphics = null;
  private _dotCount: number = 0;
  private _baseText: string = "Đang đợi đối thủ";
  private _tweenTimer: any = null;

  private _myMoveDirection: number = 0;
  public get myMoveDirection(): number {
    return this._myMoveDirection;
  }
  public set myMoveDirection(value: number) {
    let isValueChanged = this.myMoveDirection != value;
    this._myMoveDirection = value;
    if (isValueChanged) {
      if (value == 0) this.requestStopMove();
      else this.requestStartMove(value);
    }
  }

  protected onEnable(): void {
    input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
  }

  protected onDisable(): void {
    input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
  }

  start() {
    // Hide the template and the stray container sprite – pool nodes go into Root instead
    this.projectileTemplate.active = false;
    this.projectileContainer.active = false;

    // Create trajectory preview graphics node in the same space as projectiles
    const gNode = new Node("TrajectoryPreview");
    this.projectileTemplate.parent.addChild(gNode);
    this._trajectoryGraphics = gNode.addComponent(Graphics);
    this._trajectoryGraphics.lineWidth = 0;

    // pre-instantiate bubble nodes – add to Root (same space as projectiles)
    if (this.bubblePrefab) {
      const root = this.projectileTemplate.parent;
      for (let i = 0; i < 10; i++) {
        const node = instantiate(this.bubblePrefab);
        node.active = false;
        root.addChild(node);
        this.bubbleNodes.push(node);
      }
    }

    // Hide game HUD while waiting for opponent
    if (this.labelQuestion) this.labelQuestion.node.active = false;
    if (this.header) this.header.active = false;
    if (this.pbPowerRatio) this.pbPowerRatio.node.active = false;
    this.startWaitingAnimation();

    // Instantiate Colyseus Client
    // connects into (ws|wss)://hostname[:port]
    this.client = new Colyseus.Client(
      `${this.useSSL ? "wss" : "ws"}://${this.hostname}${[443, 80].includes(this.port) || this.useSSL ? "" : `:${this.port}`}`,
    );

    // Connect into the room
    this.connect();
  }

  protected update(dt: number): void {
    if (this.isStakingPower) {
      this.powerRatio += dt * this.speedStakePower;
      this.powerRatio = Math.min(1, this.powerRatio);
      this.pbPowerRatio.progress = this.powerRatio;
      this.drawTrajectory();
    } else {
      this.pbPowerRatio.progress = 0;
      this._trajectoryGraphics?.clear();
    }
  }

  private drawTrajectory() {
    const g = this._trajectoryGraphics;
    if (!g) return;
    g.clear();

    const axie = this.axieSpines[this.myIndex];
    if (!axie) return;

    let degAngle = this.myFaceDirection * 60;
    if (degAngle < 0) degAngle += 180;
    const radAngle = (Math.PI * degAngle) / 180;

    const POWER_BASE = 2000;
    const GRAVITY = 1000;
    const STEP = 0.05;
    const DOT_COUNT = 20;

    let x = axie.node.position.x;
    let y = 0;
    let vx = Math.cos(radAngle) * this.powerRatio * POWER_BASE;
    let vy = Math.sin(radAngle) * this.powerRatio * POWER_BASE;

    for (let i = 1; i <= DOT_COUNT; i++) {
      x += vx * STEP;
      y += vy * STEP;
      vy -= GRAVITY * STEP;
      if (y < 0) break;
      const alpha = Math.round(200 * (1 - i / DOT_COUNT));
      const radius = Math.max(2, 8 - i * 0.35);
      g.fillColor = new Color(255, 255, 255, alpha);
      g.circle(x, y, radius);
      g.fill();
    }
  }

  async connect() {
    try {
      this.panelEnd.node.active = false;
      this.room = await this.client.joinOrCreate(this.gameRoom);

      console.log("joined successfully!");
      console.log("user sessionId:", this.room.sessionId);

      this.room.state.players.onAdd(this.addNewPlayer.bind(this));
      this.room.state.listen("question", (value: string) => {
        if (!this.labelQuestion) return;
        this.allGameTween(0, () => {
          this.labelQuestion.string = value;
          this.allGameTween(255);
        });
      });
      this.room.state.listen("phase", (value) => {
        if (value == GamePhase.INGAME) {
          this.panelEnd.node.active = false;
          this.isStakingPower = false;
          this.stopWaitingAnimation();
          if (this.waitingLabel) this.waitingLabel.node.active = false;
          if (this.labelQuestion) {
            this.labelQuestion.node.active = true;
            this.labelQuestion.string = "";
          }
          if (this.header) {
            this.header.active = true;
            this.playerCountdown.string = "0";
            this.opponentCountdown.string = "0";
          }
          if (this.pbPowerRatio) this.pbPowerRatio.node.active = false;
        } else if (value == GamePhase.ENDED) {
          this.panelEnd.node.active = true;
          this.allTween(0);
          this.panelEnd.handleOpeningScreen(
            this.room.state.players[this.myIndex]?.score ?? 0,
            this.room.state.players[1 - this.myIndex]?.score ?? 0,
          );
          let winnerSessionId = this.room.state.winner;

          winnerSessionId == this.room.sessionId ? "YOU WIN" : "YOU LOSE";
        } else if (value == GamePhase.DRAW) {
          this.panelEnd.node.active = true;
          this.allTween(0);
          this.panelEnd.handleOpeningScreen(
            this.room.state.players[this.myIndex]?.score ?? 0,
            this.room.state.players[1 - this.myIndex]?.score ?? 0,
          );
        }
      });
      this.room.onStateChange(this.onStateChange.bind(this));

      this.room.onLeave((code) => {
        console.log("onLeave:", code);
      });
    } catch (e) {
      console.error(e);
    }
  }

  onClickRetry() {
    this.room?.leave();
    const sceneName = director.getScene()!.name;
    director.loadScene(sceneName);
  }

  onStateChange(state: any) {
    // update projectile pool nodes
    state.players.forEach((player: any, playerIndex: number) => {
      const pool = this.projectilePool[playerIndex];
      if (!pool) return;
      player.projectiles.forEach((proj: any, poolIndex: number) => {
        const node = pool[poolIndex];
        if (!node) return;
        if (!proj.active) {
          node.active = false;
          return;
        }
        node.active = true;
        node.setPosition(proj.x, proj.y, 0);
      });
    });

    // update bubble nodes
    state.bubbles.forEach((b: any, i: number) => {
      const node = this.bubbleNodes[i];
      if (!node) return;
      node.active = b.active;
      if (b.active) {
        node.setPosition(b.x, b.y, 0);
        const comp = node.getComponent(Bubble);
        if (comp) comp.setText(b.text);
      }
    });

    // update score label
    const p = state.players;
    if (p && p.length >= 2 && this.header) {
      const myScore = p[this.myIndex]?.score ?? 0;
      const oppIndex = 1 - this.myIndex;
      const oppScore = p[oppIndex]?.score ?? 0;
      this.playerCountdown.string = myScore.toString();
      this.opponentCountdown.string = oppScore.toString();
    }
  }

  onKeyDown(e: EventKeyboard) {
    if (e.keyCode == KeyCode.KEY_A || e.keyCode == KeyCode.ARROW_LEFT) {
      if (this.myMoveDirection == 1) this.myMoveDirection = 0;
      else this.myMoveDirection = -1;
    } else if (e.keyCode == KeyCode.KEY_D || e.keyCode == KeyCode.ARROW_RIGHT) {
      if (this.myMoveDirection == -1) this.myMoveDirection = 0;
      else this.myMoveDirection = 1;
    } else if (e.keyCode == KeyCode.SPACE) {
      this.isStakingPower = true;
    }
  }

  onKeyUp(e: EventKeyboard) {
    if (e.keyCode == KeyCode.KEY_A || e.keyCode == KeyCode.ARROW_LEFT) {
      if (this.myMoveDirection == -1) this.myMoveDirection = 0;
    } else if (e.keyCode == KeyCode.KEY_D || e.keyCode == KeyCode.ARROW_RIGHT) {
      if (this.myMoveDirection == 1) this.myMoveDirection = 0;
    } else if (e.keyCode == KeyCode.SPACE) {
      if (this.isStakingPower) {
        let angle = this.myFaceDirection * 60;
        this.requestFire(angle, this.powerRatio);
        this.powerRatio = 0;
        this.isStakingPower = false;
      }
    }
  }

  requestStartMove(direction: number) {
    this.room?.send("start-move", {
      direction: direction,
    });
  }

  requestStopMove() {
    this.room?.send("stop-move");
  }

  requestFire(angle: number, powerRatio: number) {
    this.room?.send("fire", {
      angle: angle,
      powerRatio: powerRatio,
    });
  }

  addNewPlayer(player, index) {
    if (player.sessionId == this.room.sessionId) {
      this.myIndex = index;
    }

    this.appearAxie(index);
    this.updateAxieView(index, player.isMoving, player.faceDirection);

    // init projectile pool for this player
    this.projectilePool[index] = [];
    const createPoolNode = (poolIndex: number) => {
      if (this.projectilePool[index][poolIndex]) return;
      const node = instantiate(this.projectileTemplate);
      node.active = false;
      // Add to Root (same parent as axies) so world positions are correct
      this.projectileTemplate.parent.addChild(node);
      this.projectilePool[index][poolIndex] = node;
    };
    player.projectiles.onAdd((_proj: any, poolIndex: number) => {
      createPoolNode(poolIndex);
    });
    player.projectiles.forEach((_proj: any, poolIndex: number) => {
      createPoolNode(poolIndex);
    });

    player.listen("isMoving", () => {
      this.updateAxieView(index, player.isMoving, player.faceDirection);
    });

    player.listen("faceDirection", () => {
      this.updateAxieView(index, player.isMoving, player.faceDirection);
    });

    player.listen("x", () => {
      this.updateAxiePosition(index, player.x);
    });
  }

  appearAxie(index: number) {
    let axie = this.axieSpines[index];
    axie.node.active = true;
  }

  updateAxieView(index: number, isMoving: boolean, faceDirection: number) {
    if (index == this.myIndex) {
      this.myFaceDirection = faceDirection;
    }
    let axie = this.axieSpines[index];

    if (isMoving) axie.setAnimation(0, "action/run", true);
    else axie.setAnimation(0, "action/idle/normal", true);

    axie.node.setScale(-faceDirection * 0.1, 0.1, 0.1);
  }

  updateAxiePosition(index: number, x: number) {
    let axie = this.axieSpines[index];
    axie.node.setPosition(x, 0, 0);
    if (index == this.myIndex) {
      this.meIndicator.setPosition(x, 0, 0);
    } else {
      this.oppIndicator.setPosition(x, 0, 0);
    }
  }

  updateLabelCountdown() {}
  startWaitingAnimation() {
    this.stopWaitingAnimation();

    const counter = { value: 0 };

    this._tweenTimer = tween(counter)
      .to(
        0.5,
        { value: 1 },
        {
          onComplete: () => {
            this._dotCount = (this._dotCount % 3) + 1;
            const dots = ".".repeat(this._dotCount);
            this.waitingLabel.string = this._baseText + dots;
          },
        },
      )
      .union()
      .repeatForever()
      .start();
  }

  stopWaitingAnimation() {
    if (this._tweenTimer) {
      this._tweenTimer.stop();
      this._tweenTimer = null;
    }
  }

  onDestroy() {
    this.stopWaitingAnimation();
  }

  allTween(opacity: number, onComplete?: () => void) {
    const t = tween(this.allNode).to(
      0.3,
      { opacity: opacity },
      { easing: easing.smooth },
    );
    if (onComplete) t.call(onComplete);
    t.start();
  }

  allGameTween(opacity: number, onComplete?: () => void) {
    const t = tween(this.gameNode).to(
      0.3,
      { opacity: opacity },
      { easing: easing.smooth },
    );
    if (onComplete) t.call(onComplete);
    t.start();
  }
  updateEnterTurn(_newValue?: any, _prevValue?: any) {}
}
