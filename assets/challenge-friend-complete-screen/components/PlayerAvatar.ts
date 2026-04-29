import { Component, Label, Sprite, SpriteFrame, _decorator } from "cc";
const { ccclass, property } = _decorator;

@ccclass("PlayerAvatar")
export class PlayerAvatar extends Component {
  @property(Sprite)
  private avatar: Sprite;

  @property(SpriteFrame)
  private baseSpriteFrame: SpriteFrame;

  public onLoad(): void {
    this.validateRequiredComponents();
  }

  private validateRequiredComponents(): void {}
}
