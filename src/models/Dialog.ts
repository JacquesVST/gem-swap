import * as p5 from "p5";
import { checkPositionInLimit, generateId } from "../utils/Functions";
import { CanvasInfo } from "./CanvasInfo";
import { Character } from "./Character";
import { Color } from "./Color";
import { Position } from "./Position";
import { Reward } from "./Reward";

export class Dialog {
    p5: p5;
    title: string;
    message: string;
    options: DialogOption[];
    color: Color;
    keep: boolean;
    id: string;

    constructor(p5: p5, title: string, message: string, options: DialogOption[], color: Color, keep?: boolean, closeCallback?: () => void) {
        this.p5 = p5;
        this.title = title;
        this.message = message;
        this.options = options;
        this.color = color;
        this.keep = keep;
        this.id = generateId();

        if (this.keep) {
            this.options.push(new DefaultDialogOption(
                this.p5, false, new Color(86, 101, 115), () => {
                    if (closeCallback) {
                        closeCallback();
                    }
                }, 'Close', '', ''
            ))
        }
    }

    draw(canvas: CanvasInfo, character?: Character,): void {
        let dialogWidth: number = canvas.playfield.x / 2;
        let dialogHeigth: number = canvas.playfield.y - (canvas.margin * 2);
        let marginX: number = (canvas.canvasSize.x / 2) - (dialogWidth / 2)

        this.p5.noStroke();
        this.p5.fill(this.color.value);
        this.p5.rect(
            marginX,
            canvas.margin * 2,
            dialogWidth,
            dialogHeigth,
            canvas.radius * 2
        );

        this.p5.textAlign(this.p5.CENTER)

        this.p5.fill(255);
        this.p5.stroke(0);
        this.p5.strokeWeight(4);
        this.p5.textSize(20)
        this.p5.text(
            this.title,
            canvas.canvasSize.x / 2,
            canvas.margin * 4,
        );

        this.p5.fill(200);
        this.p5.textSize(16)
        this.p5.text(
            this.message,
            canvas.canvasSize.x / 2,
            canvas.margin * 6,
        );

        let optionWidth: number = dialogWidth - (canvas.margin * 2);
        (dialogHeigth * 0.80) - ((this.options.length + 1) * canvas.margin)
        let optionHeight: number = ((dialogHeigth * 0.8) - ((this.options.length + 1) * canvas.margin)) / this.options.length;

        this.options.forEach((option: DialogOption, index: number) => {
            let cumulativeMargin: number = (index * (optionHeight + canvas.margin)) + (dialogHeigth * 0.2) + canvas.margin;

            let limits: number[] = [
                marginX + canvas.margin,
                marginX + canvas.margin + optionWidth,
                cumulativeMargin,
                cumulativeMargin + optionHeight
            ];

            option.limits = limits;

            let isMouseOver: boolean = checkPositionInLimit(new Position(this.p5.mouseX, this.p5.mouseY), ...limits)

            this.p5.noStroke();
            this.p5.fill(...(option.disabled ? new Color(86, 101, 115).value : option.color.value), isMouseOver ? 255 : 200);
            this.p5.rect(
                marginX + canvas.margin,
                cumulativeMargin,
                optionWidth,
                optionHeight,
                canvas.radius * 2
            );

            if (option instanceof RewardDialogOption) {
                this.p5.textAlign(this.p5.LEFT)
                this.p5.fill(option.color.value);
                this.p5.stroke(0);
                this.p5.strokeWeight(4);
                this.p5.textSize(16)
                this.p5.text(
                    option.reward.rarity,
                    (canvas.canvasSize.x / 2) - (optionWidth / 2) + canvas.padding,
                    cumulativeMargin + canvas.margin + (canvas.padding / 2),
                );

                if (option.reward.price && character) {
                    let canAfford: boolean = character.gold >= option.reward.price;

                    this.p5.textAlign(this.p5.RIGHT)
                    this.p5.fill(( canAfford? new Color(244, 208, 63) : new Color(231, 76, 60)).value);
                    this.p5.stroke(0);
                    this.p5.strokeWeight(4);
                    this.p5.textSize(16)
                    this.p5.text(
                        `$ ${option.reward.price}`,
                        (canvas.canvasSize.x / 2) + (optionWidth / 2) - canvas.padding,
                        cumulativeMargin + canvas.margin + (canvas.padding / 2),
                    );

                    option.disabled = !canAfford;
                }

                this.p5.textAlign(this.p5.CENTER)

                this.p5.fill(255);
                this.p5.stroke(0);
                this.p5.strokeWeight(4);
                this.p5.textSize(20)
                this.p5.text(
                    option.reward.name,
                    canvas.canvasSize.x / 2,
                    cumulativeMargin + (3 * canvas.margin),
                );

                this.p5.fill(200);
                this.p5.textSize(16)
                this.p5.text(
                    option.reward.description,
                    canvas.canvasSize.x / 2,
                    cumulativeMargin + (5 * canvas.margin),
                );
            }

            if (option instanceof DefaultDialogOption) {
                this.p5.textAlign(this.p5.CENTER)


                let positonY: number = cumulativeMargin + (2 * canvas.margin)

                if (!option.subtext && !option.subsubtext) {
                    positonY = cumulativeMargin + optionHeight / 2
                }

                this.p5.fill(255);
                this.p5.stroke(0);
                this.p5.strokeWeight(4);
                this.p5.textSize(20)
                this.p5.text(
                    option.text,
                    canvas.canvasSize.x / 2,
                    positonY,
                );

                this.p5.fill(200);
                this.p5.textSize(16)
                this.p5.text(
                    option.subtext,
                    canvas.canvasSize.x / 2,
                    cumulativeMargin + (4 * canvas.margin),
                );

                this.p5.fill(200);
                this.p5.textSize(16)
                this.p5.text(
                    option.subsubtext,
                    canvas.canvasSize.x / 2,
                    cumulativeMargin + (6 * canvas.margin),
                );
            }
        });
    }
}


export class DialogOption {
    p5: p5;
    disabled: boolean;
    color: Color;
    action: () => void;
    limits: number[];

    constructor(p5: p5, disabled: boolean, color: Color, action: () => void) {
        this.p5 = p5;
        this.disabled = disabled
        this.color = color;
        this.action = action;
    }
}

export class RewardDialogOption extends DialogOption {
    reward: Reward;

    constructor(p5: p5, reward: Reward, disabled: boolean, color: Color, action: () => void) {
        super(p5, disabled, color, action)
        this.reward = reward;
    }
}

export class DefaultDialogOption extends DialogOption {
    text: string;
    subtext: string;
    subsubtext: string

    constructor(p5: p5, disabled: boolean, color: Color, action: () => void, text: string, subtext: string, subsubtext: string) {
        super(p5, disabled, color, action)
        this.text = text;
        this.subtext = subtext
        this.subsubtext = subsubtext
    }
}
