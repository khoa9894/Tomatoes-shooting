import {
  Button,
  Component,
  Label,
  Sprite,
  SpriteFrame,
  UI,
  UIOpacity,
  Vec3,
  _decorator,
  easing,
  tween,
} from "cc";
import { PlayerAvatarWithFlag } from "./components/PlayerAvatarWithFlag";

const { ccclass, property, requireComponent } = _decorator;

type ChallengeMatchProfile = Record<string, unknown> & {
  finished?: boolean;
};

@ccclass("ChallengeFriendCompleteScreen")
export class ChallengeFriendCompleteScreen extends Component {
  @property(PlayerAvatarWithFlag)
  private playerAvatarWithFlag: PlayerAvatarWithFlag;

  @property(PlayerAvatarWithFlag)
  private opponentAvatarWithFlag: PlayerAvatarWithFlag;

  @property([SpriteFrame])
  private glowFrames: SpriteFrame[] = [];

  @property(Sprite)
  private glow: Sprite;

  @property(Label)
  private titleLabel: Label;

  @property(UIOpacity)
  private backgroundMask: UIOpacity;

  @property(UIOpacity)
  private resultOpacity: UIOpacity;

  @property(UIOpacity)
  private vsOpacity: UIOpacity;

  @property(UIOpacity)
  private closeButtonOpacity: UIOpacity;

  @property(Button)
  private closeButton: Button;

  @property(UIOpacity)
  private UIOpacity: UIOpacity;

  private playerAvatarOpacity: UIOpacity;
  private opponentAvatarOpacity: UIOpacity;
  private basePlayerAvatarPosition: { x: number; y: number };
  private baseOpponentAvatarPosition: { x: number; y: number };

  public __preload(): void {}

  public onLoad(): void {
    this.validateRequiredComponents();

    this.playerAvatarOpacity =
      this.playerAvatarWithFlag.getComponent(UIOpacity);
    this.opponentAvatarOpacity =
      this.opponentAvatarWithFlag.getComponent(UIOpacity);

    this.backgroundMask.opacity = 0;
    this.backgroundMask.node.active = false;
    this.playerAvatarOpacity.opacity = 0;
    this.opponentAvatarOpacity.opacity = 0;
    this.resultOpacity.opacity = 0;
    this.vsOpacity.opacity = 0;
    this.resultOpacity.opacity = 0;
    this.closeButtonOpacity.opacity = 0;

    this.basePlayerAvatarPosition = {
      x: this.playerAvatarWithFlag.node.position.x,
      y: this.playerAvatarWithFlag.node.position.y,
    };
    this.baseOpponentAvatarPosition = {
      x: this.opponentAvatarWithFlag.node.position.x,
      y: this.opponentAvatarWithFlag.node.position.y,
    };
    // ----------------------------------

    this.listenScreenEvents();
  }

  public onDestroy(): void {
    this.unListenScreenEvents();
  }

  private validateRequiredComponents() {}

  private listenScreenEvents() {}

  private unListenScreenEvents() {}

  public handleOpeningScreen = (playerScore: number, opponentScore: number) => {
    this.playerAvatarWithFlag.scoreLabel.string = "0";
    this.opponentAvatarWithFlag.scoreLabel.string = "0";
    tween(this.UIOpacity)
      .to(0.3, { opacity: 255 }, { easing: easing.smooth })
      .call(() => {
        this.runAnimationPrepareChallenge(0, playerScore, opponentScore);
      })
      .start();
  };

  public close() {
    console.log("close ChallengeFriendCompleteScreen");
    tween(this.UIOpacity)
      .to(0.3, { opacity: 0 }, { easing: easing.smooth })
      .call(() => {})
      .start();
  }

  public async handleClickedClose() {
    this.close();
  }

  public async runAnimationPrepareChallenge(
    delay = 0,
    playerScore: number,
    opponentScore: number,
  ): Promise<void> {
    this.closeButtonOpacity.opacity = 0;
    this.closeButton.interactable = false;
    await this.updateChallengeDataAsync(playerScore, opponentScore);

    this.backgroundMask.node.active = true;
    this.backgroundMask.opacity = 0;
    this.playerAvatarOpacity.opacity = 0;
    this.opponentAvatarOpacity.opacity = 0;
    this.vsOpacity.opacity = 0;
    this.resultOpacity.opacity = 0;
    this.vsOpacity.node.setScale(new Vec3(0, 0, 1));
    this.resultOpacity.node.setScale(new Vec3(0, 0, 1));

    this.playerAvatarWithFlag.scoreLabel.string =
      playerScore >= 0 ? playerScore.toString() : "";
    this.opponentAvatarWithFlag.scoreLabel.string =
      opponentScore >= 0 ? opponentScore.toString() : "";

    this.playerAvatarWithFlag.node.setPosition(
      this.basePlayerAvatarPosition.x + 600,
      this.basePlayerAvatarPosition.y,
    );
    this.opponentAvatarWithFlag.node.setPosition(
      this.baseOpponentAvatarPosition.x - 600,
      this.baseOpponentAvatarPosition.y,
    );

    const moveDuration = 0.6;
    const fadeDuration = 0.3;
    const countDuration = 1.2;
    const scoreProxy = { player: 0, opponent: 0 };

    return new Promise((resolve) => {
      tween(this.node)
        .parallel(
          tween(this.backgroundMask).to(moveDuration, { opacity: 255 * 0.8 }),
          tween(this.playerAvatarWithFlag.node).to(
            moveDuration,
            {
              x: this.basePlayerAvatarPosition.x,
              y: this.basePlayerAvatarPosition.y,
            },
            { easing: easing.backOut },
          ),
          tween(this.opponentAvatarWithFlag.node).to(
            moveDuration,
            {
              x: this.baseOpponentAvatarPosition.x,
              y: this.baseOpponentAvatarPosition.y,
            },
            { easing: easing.backOut },
          ),
          tween(this.playerAvatarOpacity).to(fadeDuration, { opacity: 255 }),
          tween(this.opponentAvatarOpacity).to(fadeDuration, { opacity: 255 }),
          tween(this.vsOpacity).to(fadeDuration, { opacity: 255 }),
          tween(this.vsOpacity.node).to(moveDuration, {
            scale: new Vec3(1, 1, 1),
          }),
          tween(this.resultOpacity).to(fadeDuration, { opacity: 255 }),
          tween(this.resultOpacity.node).to(moveDuration, {
            scale: new Vec3(1, 1, 1),
          }),
        )
        .then(
          tween(this.node).parallel(
            tween(scoreProxy).to(
              countDuration,
              { player: playerScore, opponent: opponentScore },
              {
                onUpdate: () => {
                  this.playerAvatarWithFlag.scoreLabel.string =
                    playerScore >= 0
                      ? Math.round(scoreProxy.player).toString()
                      : "";
                  if (opponentScore >= 0) {
                    this.opponentAvatarWithFlag.scoreLabel.string =
                      opponentScore >= 0
                        ? Math.round(scoreProxy.opponent).toString()
                        : "";
                  }
                },
              },
            ),

            tween(this.closeButtonOpacity).to(0.3, { opacity: 255 }),
          ),
        )
        .call(() => {
          this.closeButton.interactable = true;
          resolve();
        })
        .start();
    });
  }

  private async updateChallengeDataAsync(
    playerScore: number,
    opponentScore: number,
  ): Promise<void> {
    this.resolveMatchResult(playerScore, opponentScore);
  }

  private resolveMatchResult(playerScore: number, opponentScore: number): void {
    const isWin = playerScore > opponentScore;
    const isDraw = playerScore === opponentScore;

    this.glow.node.active = false;
    this.titleLabel.string = "";

    if (isWin) {
      this.playerAvatarWithFlag.updateState("win");
      this.opponentAvatarWithFlag.updateState("lose");
      this.glow.spriteFrame = this.glowFrames[0];
      this.glow.node.active = true;
      this.titleLabel.string = "Chiến Thắng";
    } else if (isDraw) {
      this.playerAvatarWithFlag.updateState("lose");
      this.opponentAvatarWithFlag.updateState("lose");
      this.glow.spriteFrame = this.glowFrames[0];
      this.glow.node.active = true;
      this.titleLabel.string = "Hòa";
    } else {
      this.playerAvatarWithFlag.updateState("lose");
      this.opponentAvatarWithFlag.updateState("win");
      this.glow.spriteFrame = this.glowFrames[0];
      this.glow.node.active = true;
      this.titleLabel.string = "Thua";
    }
  }
}
