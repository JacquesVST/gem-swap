import * as p5 from "p5";
import { CanvasInfo } from "./CanvasInfo";
import { Color } from "./Color";

export class ProgressBar {
    maxValue: number;
    value: number;
    title: string;
    color: Color;

    constructor(maxValue: number, value: number, title: string, color: Color) {
        this.maxValue = maxValue;
        this.value = value;
        this.title = title;
        this.color = color;
    }

    drawBar(p5: p5, index: number, canvas: CanvasInfo): void {
        let percentageOfBar: number = this.value / this.maxValue

        let commonMargin: number = (canvas.margin * (index + 2)) + (canvas.uiBarSize * index)
        let baseElementSize: number = (canvas.playfield.x - (2 * canvas.padding))

        p5.fill(percentageOfBar ? this.color.value : [20, 20, 20]);
        p5.noStroke()
        p5.rect(
            canvas.margin + canvas.padding,
            commonMargin,
            baseElementSize * percentageOfBar,
            canvas.uiBarSize,
            canvas.radius + canvas.padding
        );

        p5.fill(this.color.value)
        p5.stroke(0)
        p5.strokeWeight(4)
        p5.textSize(20)

        p5.textAlign(p5.LEFT)
        p5.text(
            this.title,
            canvas.margin + canvas.padding * 4,
            commonMargin + canvas.padding,
        );

        p5.textAlign(p5.RIGHT)
        p5.text(
            `${Math.floor(this.value)}/${Math.floor(this.maxValue)}`,
            canvas.margin + baseElementSize - (canvas.padding * 4),
            commonMargin + canvas.padding,
        );
    }
}
