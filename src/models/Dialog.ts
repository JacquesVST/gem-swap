import * as P5 from "p5";
import { checkPositionInLimit, generateId } from "../utils/Functions";
import { AnimationStatus } from "./AnimatableObject";
import { CanvasInfo } from "./CanvasInfo";
import { Color } from "./Color";
import { Position } from "./Position";
import { Reward } from "./Reward";
import { Run } from "./Run";

export class Dialog {
    p5: P5;
    canvas: CanvasInfo
    title: string;
    message: string;
    options: DialogOption[];
    color: Color;
    keep: boolean;
    skip: boolean;
    id: string;

    animationStatus: AnimationStatus = AnimationStatus.NOT_STARTED;
    frames: number = 0;
    velocityFade: number = 0;
    relativeFade: number = 0;

    constructor(p5: P5, canvas: CanvasInfo, title: string, message: string, options: DialogOption[], color: Color, keep?: boolean, skip?: boolean, closeCallback?: () => void) {
        this.p5 = p5;
        this.canvas = canvas;
        this.title = title;
        this.message = message;
        this.options = options;
        this.color = color;
        this.keep = keep;
        this.skip = skip
        this.id = generateId();

        if (this.keep) {
            this.options.push(new DefaultDialogOption(
                this.canvas.p5, false, new Color(86, 101, 115), () => {
                    if (closeCallback) {
                        closeCallback();
                    }
                }, 'Close', '', ''
            ));
        }

        if (this.skip) {
            this.options.push(new DefaultDialogOption(
                this.canvas.p5, false, new Color(86, 101, 115), () => {
                    if (closeCallback) {
                        closeCallback();
                    }
                }, 'Skip', '', ''
            ));
        }
    }

    draw(run?: Run): void {
        if (this.animationStatus === AnimationStatus.NOT_STARTED) {
            this.setupAnimation();
        }

        let dialogWidth: number = this.canvas.playfield.x / 2;
        let dialogHeigth: number = this.canvas.playfield.y - (this.canvas.margin * 2);
        let marginX: number = (this.canvas.canvasSize.x / 2) - (dialogWidth / 2)

        this.p5.noStroke();
        this.p5.fill([...this.color.value, 255 + this.relativeFade]);
        this.p5.rect(
            marginX,
            this.canvas.margin * 2,
            dialogWidth,
            dialogHeigth,
            this.canvas.radius * 2
        );

        this.p5.textAlign(this.p5.CENTER)

        this.p5.fill(255, 255, 255, 255 + this.relativeFade);
        this.p5.stroke(0, 0, 0, 255 + this.relativeFade);
        this.p5.strokeWeight(4);
        this.p5.textSize(20)
        this.p5.text(
            this.title,
            this.canvas.canvasSize.x / 2,
            this.canvas.margin * 4,
        );

        this.p5.fill(200, 200, 200, 255 + this.relativeFade);
        this.p5.textSize(16)
        this.p5.text(
            this.message,
            this.canvas.canvasSize.x / 2,
            this.canvas.margin * 6,
        );

        let adptUItooptions: boolean = this.options.length < 3

        let optionWidth: number = dialogWidth - (this.canvas.margin * 2);
        let optionHeight: number = ((dialogHeigth * 0.85) - ((this.options.length + (adptUItooptions ? 2 : 0) + 1) * this.canvas.margin)) / (this.options.length + (adptUItooptions ? 2 : 0));

        this.options.forEach((option: DialogOption, index: number) => {

            let cumulativeMargin: number = ((adptUItooptions ? index + 1 : index) * (optionHeight + this.canvas.margin)) + (dialogHeigth * 0.15) + this.canvas.margin;

            let limits: number[] = [
                marginX + this.canvas.margin,
                marginX + this.canvas.margin + optionWidth,
                cumulativeMargin,
                cumulativeMargin + optionHeight
            ];

            option.limits = limits;

            let isMouseOver: boolean = checkPositionInLimit(new Position(this.p5.mouseX, this.p5.mouseY), ...limits)

            this.p5.noStroke();
            this.p5.fill(...(option.disabled ? new Color(86, 101, 115).value : option.color.value), (isMouseOver ? 255 : 200) + this.relativeFade);
            this.p5.rect(
                marginX + this.canvas.margin,
                cumulativeMargin,
                optionWidth,
                optionHeight,
                this.canvas.radius * 2
            );

            if (option instanceof RewardDialogOption) {
                this.p5.textAlign(this.p5.LEFT)
                this.p5.fill([...option.color.value, 255 + this.relativeFade]);
                this.p5.stroke(0, 0, 0, 255 + this.relativeFade);
                this.p5.strokeWeight(4);
                this.p5.textSize(16)
                this.p5.text(
                    option.reward.rarity,
                    (this.canvas.canvasSize.x / 2) - (optionWidth / 2) + this.canvas.padding,
                    cumulativeMargin + this.canvas.margin + (this.canvas.padding / 2),
                );

                if (option.reward.price && run?.character) {
                    let canAfford: boolean = run?.character.gold >= option.reward.price;

                    this.p5.textAlign(this.p5.RIGHT)
                    this.p5.fill([...(canAfford ? new Color(244, 208, 63) : new Color(231, 76, 60)).value, 255 + this.relativeFade]);
                    this.p5.stroke(0, 0, 0, 255 + this.relativeFade);
                    this.p5.strokeWeight(4);
                    this.p5.textSize(16)
                    this.p5.text(
                        `$ ${option.reward.price}`,
                        (this.canvas.canvasSize.x / 2) + (optionWidth / 2) - this.canvas.padding,
                        cumulativeMargin + this.canvas.margin + (this.canvas.padding / 2),
                    );

                    option.disabled = !canAfford;
                }

                if (option.reward.unique) {
                    this.p5.textAlign(this.p5.LEFT)
                    this.p5.fill([...new Color(243, 156, 18).value, 255 + this.relativeFade]);
                    this.p5.stroke(0, 0, 0, 255 + this.relativeFade);
                    this.p5.strokeWeight(4);
                    this.p5.textSize(16)
                    this.p5.text(
                        'Unique',
                        (this.canvas.canvasSize.x / 2) - (optionWidth / 2) + this.canvas.padding,
                        cumulativeMargin + (this.canvas.margin * 3) + (this.canvas.padding / 2),
                    );
                }

                this.p5.textAlign(this.p5.CENTER)

                this.p5.fill(255 + this.relativeFade);
                this.p5.stroke(0, 0, 0, 255 + this.relativeFade);
                this.p5.strokeWeight(4);
                this.p5.textSize(20)
                this.p5.text(
                    option.reward.name,
                    this.canvas.canvasSize.x / 2,
                    cumulativeMargin + (3 * this.canvas.margin),
                );

                this.p5.fill(200 + this.relativeFade);
                this.p5.textSize(16)

                this.p5.text(
                    option.reward.description,
                    this.canvas.canvasSize.x / 2,
                    cumulativeMargin + (5 * this.canvas.margin),
                );

                if (option.reward.isActive) {
                    this.p5.text(
                        'Single Use',
                        this.canvas.canvasSize.x / 2,
                        cumulativeMargin + (7 * this.canvas.margin),
                    );
                }
            }

            if (option instanceof DefaultDialogOption) {
                this.p5.textAlign(this.p5.CENTER)


                let positonY: number = cumulativeMargin + (2 * this.canvas.margin)

                if (!option.subtext && !option.subsubtext) {
                    positonY = cumulativeMargin + optionHeight / 2
                }

                this.p5.fill(255 + this.relativeFade);
                this.p5.stroke(0, 0, 0, 255 + this.relativeFade);
                this.p5.strokeWeight(4);
                this.p5.textSize(20)
                this.p5.text(
                    option.text,
                    this.canvas.canvasSize.x / 2,
                    positonY,
                );

                this.p5.fill(200, 200, 200, 255 + this.relativeFade);
                this.p5.textSize(16)
                this.p5.text(
                    option.subtext,
                    this.canvas.canvasSize.x / 2,
                    cumulativeMargin + (4 * this.canvas.margin),
                );

                this.p5.fill(200, 200, 200, 255 + this.relativeFade);
                this.p5.textSize(16)
                this.p5.text(
                    option.subsubtext,
                    this.canvas.canvasSize.x / 2,
                    cumulativeMargin + (6 * this.canvas.margin),
                );
            }
        });

        if (this.animationStatus === AnimationStatus.IN_PROGRESS) {
            this.updateAnimationDeltas()
        }
    }

    setupAnimation(): void {
        this.animationStatus = AnimationStatus.IN_PROGRESS;
        this.frames = 15;
        this.relativeFade = -255;
        this.velocityFade = this.relativeFade / this.frames;
    }

    updateAnimationDeltas(): void {
        if (this.frames) {
            this.relativeFade -= this.velocityFade;

            this.frames--;
            if (this.frames === 0) {
                this.relativeFade = 0;
                this.velocityFade = 0;
                this.animationStatus = AnimationStatus.FINISHED;
            }
        }
    }
}

export class DialogOption {
    p5: P5;
    disabled: boolean;
    color: Color;
    action: () => void;
    limits: number[];

    constructor(p5: P5, disabled: boolean, color: Color, action: () => void) {
        this.p5 = p5;
        this.disabled = disabled
        this.color = color;
        this.action = action;
    }
}

export class RewardDialogOption extends DialogOption {
    reward: Reward;

    constructor(p5: P5, reward: Reward, disabled: boolean, color: Color, action: () => void) {
        super(p5, disabled, color, action)
        this.reward = reward;
    }
}

export class DefaultDialogOption extends DialogOption {
    text: string;
    subtext: string;
    subsubtext: string

    constructor(p5: P5, disabled: boolean, color: Color, action: () => void, text: string, subtext: string, subsubtext: string) {
        super(p5, disabled, color, action)
        this.text = text;
        this.subtext = subtext
        this.subsubtext = subsubtext
    }
}

export class DialogController {
    canvas: CanvasInfo;
    dialogs: Dialog[];

    constructor(canvas: CanvasInfo) {
        this.canvas = canvas;
        this.dialogs = [];
    }

    get currentDialog(): Dialog {
        return this.dialogs[0] ?? undefined
    }

    draw(run?: Run) {
        if (this.currentDialog) {
            this.dialogs[0].draw(run);
        }
    }

    close(): void {
        this.dialogs.shift();
    }

    clear() {
        this.dialogs = [];
    }

    mouseClickedDialog(position: Position, run?: Run): void {
        let selectedIndex: number = -1;

        this.currentDialog.options.forEach((option: DialogOption, index: number) => {
            if (option?.limits && checkPositionInLimit(position, ...option.limits)) {

                selectedIndex = index;
                if (!option.disabled) {
                    option.action();
                    if (option instanceof RewardDialogOption && option?.reward?.price) {
                        run?.textAnimationController.goldAnimation(option.reward.price * -1)
                        option.reward.price = Math.floor(option.reward.price * 1.2);
                    }
                }
            }
        })

        if (selectedIndex >= 0) {
            if (this.currentDialog && !this.currentDialog.keep) {
                this.close();

                run?.updatePlayerStatsAndRewards();
            }
        }
    }

    rewardListToDialogOption(rewards: Reward[], run: Run, callback?: () => void): DialogOption[] {
        return rewards.map(
            (reward: Reward) => {
                return new RewardDialogOption(
                    run.p5,
                    reward,
                    false,
                    Reward.rarityColors()[reward.rarity].color,
                    () => {
                        if (reward.isActive) {
                            run.character.activeItem = reward;
                        } else {
                            reward.effect();
                            run.character.rewards.push(reward);
                        }
                        if (callback) {
                            callback();
                        }
                    }
                )
            });
    }
}