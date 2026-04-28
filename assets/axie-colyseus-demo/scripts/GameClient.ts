import {
  _decorator,
  Component,
  director,
  EventKeyboard,
  Input,
  input,
  instantiate,
  KeyCode,
  Label,
  Node,
  Prefab,
  ProgressBar,
  sp,
} from "cc";
import Colyseus from "db://colyseus-sdk/colyseus.js";
import { GamePhase } from "./GamePhases";
import { Bubble } from "../../prefabs/Bubble";
const { ccclass, property } = _decorator;

@ccclass("GameClient")
export class GameClient extends Component {
  @property hostname = "localhost"!;
  @property port = 2567!;
  @property useSSL = false!;
  @property gameRoom: string = "game_room"!;

  @property(Node) projectileTemplate: Node = null!;
  @property(Node) projectileContainer: Node = null!;
  @property([sp.Skeleton]) axieSpines: sp.Skeleton[] = []!;
  @property(Label) labelQuestion: Label = null!; // replaces labelCountdown
  @property(Label) labelCurrTurn: Label = null!; // reused as score display
  @property(ProgressBar) pbPowerRatio: ProgressBar = null!;
  @property(Node) meIndicator: Node = null!;
  @property(Node) oppIndicator: Node = null!;
  @property speedStakePower: number = 0.2!;
  @property(Node) panelEnd: Node = null!;
  @property(Label) labelEnd: Label = null!;
  @property(Prefab) bubblePrefab: Prefab = null!;
  @property(Node) bubbleContainer: Node = null!;

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
    } else {
      this.pbPowerRatio.progress = 0;
    }
  }

  async connect() {
    try {
      this.panelEnd.active = false;
      this.room = await this.client.joinOrCreate(this.gameRoom);

      console.log("joined successfully!");
      console.log("user sessionId:", this.room.sessionId);

      this.room.state.players.onAdd(this.addNewPlayer.bind(this));
      this.room.state.listen("question", (value: string) => {
        if (this.labelQuestion) this.labelQuestion.string = value;
      });
      this.room.state.listen("phase", (value) => {
        if (value == GamePhase.INGAME) {
          this.panelEnd.active = false;
          this.isStakingPower = false;
          if (this.labelQuestion) this.labelQuestion.string = "";
          if (this.labelCurrTurn) this.labelCurrTurn.string = "0 - 0";
        } else if (value == GamePhase.ENDED) {
          this.panelEnd.active = true;
          let winnerSessionId = this.room.state.winner;
          this.labelEnd.string =
            winnerSessionId == this.room.sessionId ? "YOU WIN" : "YOU LOSE";
        } else if (value == GamePhase.DRAW) {
          this.panelEnd.active = true;
          this.labelEnd.string = "GAME DRAW";
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
    if (p && p.length >= 2 && this.labelCurrTurn) {
      const myScore = p[this.myIndex]?.score ?? 0;
      const oppIndex = 1 - this.myIndex;
      const oppScore = p[oppIndex]?.score ?? 0;
      this.labelCurrTurn.string = `You ${myScore} - ${oppScore} Opp`;
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

  updateEnterTurn(_newValue?: any, _prevValue?: any) {}
}
