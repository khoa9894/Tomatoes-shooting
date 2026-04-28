import { _decorator, Component, Label, Node } from "cc";
const { ccclass, property } = _decorator;

@ccclass("Bubble")
export class Bubble extends Component {
  @property(Label)
  private label!: Label;

  public setText(text: string) {
    this.label.string = text;
  }
}
