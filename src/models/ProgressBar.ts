import * as p5 from "p5";
import { CanvasInfo } from "./CanvasInfo";
import { Color } from "./Color";
import { formatNumber } from "../utils/Functions";

export class ProgressBar {
    maxValue: number;
    value: number;
    title: string;
    color: Color;

    frames: number = 0;
    velocity: number = 0;
    delta: number = 0;
    callback: () => void;

    constructor(maxValue: number, value: number, title: string, color: Color) {
        this.maxValue = maxValue;
        this.value = value;
        this.title = title;
        this.color = color;
    }

    animate(difference: number, callback: () => void) {
        this.frames = 25
        this.velocity = difference / this.frames;
        this.delta = difference;
        this.callback = callback;
    }

    drawBar(p5: p5, index: number, canvas: CanvasInfo): void {
        let percentageOfBar: number = this.value / this.maxValue

        let commonMargin: number = (canvas.margin * (index + 2)) + (canvas.uiBarSize * index)
        let baseElementSize: number = (canvas.playfield.x - (2 * canvas.padding))

        let finalElementSize = (baseElementSize * percentageOfBar) + this.delta
        finalElementSize = finalElementSize > baseElementSize ? baseElementSize : finalElementSize,

        p5.fill(percentageOfBar ? this.color.value : [20, 20, 20]);
        p5.noStroke()
        p5.rect(
            canvas.margin + canvas.padding,
            commonMargin,
            finalElementSize <= 1 ? 1 : finalElementSize,
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
            `${formatNumber(Math.floor(this.value))}/${formatNumber(Math.floor(this.maxValue))}`,
            canvas.margin + baseElementSize - (canvas.padding * 4),
            commonMargin + canvas.padding,
        );
        this.updateAnimation();
    }

    updateAnimation() {
        this.frames--
        this.delta -= this.velocity 
        if (this.frames === 0){
            this.delta = 0
            this.velocity = 0
            if(this.callback) {
                this.callback();
                this.callback = undefined
            }
        }
    }
}
