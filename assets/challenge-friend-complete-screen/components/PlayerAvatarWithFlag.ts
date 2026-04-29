import {
  Component,
  Label,
  Node,
  Sprite,
  type Tween,
  _decorator,
  tween,
} from "cc";
import { PlayerAvatar } from "./PlayerAvatar";

const { ccclass, property, executeInEditMode } = _decorator;

@ccclass("PlayerAvatarWithFlag")
@executeInEditMode(true)
export class PlayerAvatarWithFlag extends Component {
  @property(PlayerAvatar)
  public playerAvatar: PlayerAvatar;

  @property(Label)
  public scoreLabel: Label;

  @property(Node)
  private medal: Node;

  @property(Node)
  private glow: Node;

  protected __preload(): void {
    this.validateRequiredComponents();
  }

  private validateRequiredComponents(): void {}

  public updateState(state: "win" | "lose" | "waiting"): void {
    switch (state) {
      case "win":
        this.medal.active = true;
        this.glow.active = true;
        break;
      case "lose":
      case "waiting":
        this.medal.active = false;
        this.glow.active = false;
        break;
    }
  }
}
