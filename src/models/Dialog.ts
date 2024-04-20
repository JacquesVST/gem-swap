import * as p5 from "p5";
import { checkPositionInLimit } from "../utils/Functions";
import { CanvasInfo } from "./CanvasInfo";
import { Color } from "./Color";
import { DialogOption } from "./DialogOption";
import { Position } from "./Position";

export class Dialog {
    p5: p5;
    title: string;
    message: string;
    options: DialogOption[];
    color: Color;

    constructor(p5: p5, title: string, message: string, options: DialogOption[], color: Color) {
        this.p5 = p5;
        this.title = title;
        this.message = message;
        this.options = options;
        this.color = color;
    }

    draw(canvas: CanvasInfo): void {
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
        let optionHeight: number = (dialogHeigth / this.options.length) * 0.75;

        this.options.forEach((option: DialogOption, index: number) => {
            let cumulativeMargin: number = (index * (optionHeight + canvas.margin)) + (canvas.margin * 8);

            let limits: number[] = [
                marginX + canvas.margin,
                marginX + canvas.margin + optionWidth,
                cumulativeMargin,
                cumulativeMargin + optionHeight
            ];

            option.limits = limits;

            let isMouseOver: boolean = checkPositionInLimit(new Position(this.p5.mouseX, this.p5.mouseY), ...limits)

            this.p5.noStroke();
            this.p5.fill(...option.color.value, isMouseOver ? 255 : 200);
            this.p5.rect(
                marginX + canvas.margin,
                cumulativeMargin,
                optionWidth,
                optionHeight,
                canvas.radius * 2
            );

            this.p5.fill(255);
            this.p5.stroke(0);
            this.p5.strokeWeight(4);
            this.p5.textSize(20)
            this.p5.text(
                option.title,
                canvas.canvasSize.x / 2,
                cumulativeMargin + (2 * canvas.margin),
            );

            this.p5.fill(200);
            this.p5.textSize(16)
            this.p5.text(
                option.message,
                canvas.canvasSize.x / 2,
                cumulativeMargin + (4 * canvas.margin),
            );
        })
    }
}
