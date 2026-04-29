import { Component, Node, _decorator } from 'cc'
const { ccclass, property } = _decorator

@ccclass('GlowBG')
export class GlowBG extends Component {
    @property(Node)
    private playerGlow: Node

    @property(Node)
    private opponentGlow: Node

    @property(Node)
    private centerGlow: Node

    public setGlowWin(): void {
        this.playerGlow.active = true
        this.opponentGlow.active = false
        this.centerGlow.active = false
    }

    public setGlowLose(): void {
        this.playerGlow.active = false
        this.opponentGlow.active = true
        this.centerGlow.active = false
    }

    public setGlowDraw(): void {
        this.playerGlow.active = true
        this.opponentGlow.active = true
        this.centerGlow.active = false
    }

    public setGlowWaiting(): void {
        this.playerGlow.active = false
        this.opponentGlow.active = false
        this.centerGlow.active = true
    }
}
