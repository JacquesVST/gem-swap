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

    velocityFade: number = 0;
    fade: number = 255;
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

    animateFade(callback: () => void) {
        this.frames = 25
        this.fade = 255
        this.velocityFade = this.fade / this.frames;
        this.callback = callback;
    }

    drawBar(p5: p5, index: number, canvas: CanvasInfo): void {
        let percentageOfBar: number = (this.value + this.delta) / this.maxValue

        let commonMargin: number = (canvas.margin * (index + 2)) + (canvas.uiBarSize * index)
        let maxBarSize: number = (canvas.playfield.x - (2 * canvas.padding))

        let finalElementSize: number = (maxBarSize * percentageOfBar);
        finalElementSize = finalElementSize > maxBarSize ? maxBarSize : finalElementSize,

        p5.fill(percentageOfBar ? [...this.color.value, this.fade] : [20, 20, 20, this.fade], );
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
            canvas.margin + maxBarSize - (canvas.padding * 4),
            commonMargin + canvas.padding,
        );
        this.updateAnimation();
    }

    updateAnimation() {
        this.frames--
        this.delta -= this.velocity 
        this.fade -= this.velocityFade

        if (this.frames === 0){
            this.delta = 0
            this.velocity = 0

            this.fade = 255
            this.velocityFade = 0;
            if(this.callback) {
                this.callback();
                this.callback = undefined
            }
        }
    }
}
