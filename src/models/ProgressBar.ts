import * as P5 from "p5";
import { checkPositionInLimit, formatNumber } from "../utils/Functions";
import { CanvasInfo } from "./CanvasInfo";
import { Color } from "./Color";
import { Enemy } from "./Enemy";
import { EventEmitter, EventParams } from "./EventEmitter";
import { Run } from "./Run";
import { Position } from "./Position";

export class ProgressBar extends EventEmitter {
    maxValue: number;
    value: number;
    title: string;
    color: Color;
    top: boolean;
    limits: number[];

    frames: number = 0;
    velocity: number = 0;
    delta: number = 0;
    velocityFade: number = 0;
    fade: number = 255;

    constructor(maxValue: number, value: number, title: string, color: Color, top: boolean) {
        super('ProgressBar');
        this.maxValue = maxValue;
        this.value = value;
        this.title = title;
        this.color = color;
        this.top = top;
    }

    animate(difference: number, params: EventParams): void {
        this.frames = 10;
        this.velocity = difference / this.frames;
        this.delta = difference;
        this.params = params;
    }

    drawBar(index: number, canvas: CanvasInfo): void {
        const p5: P5 = canvas.p5;
        let percentageOfBar: number = (this.value + this.delta) / this.maxValue;

        let commonMargin: number;
        if (this.top) {
            commonMargin = (canvas.margin * (index + 2)) + (canvas.uiBarSize * index) + canvas.margin / 2;
        } else {
            let bottomIndex: number = index - 2;
            commonMargin = canvas.canvasSize.y - canvas.margin - canvas.bottomUiSize + (canvas.uiBarSize * bottomIndex) + (canvas.margin * bottomIndex) + canvas.margin / 2;
        }
        let maxBarSize: number = (canvas.playfield.x - (2 * canvas.margin));

        let finalElementSize: number = (maxBarSize * percentageOfBar);
        finalElementSize = finalElementSize > maxBarSize ? maxBarSize : finalElementSize;

        this.limits = [
            canvas.margin * 1.5,
            canvas.playfield.x - canvas.margin * 1.5,
            commonMargin - canvas.margin / 2,
            commonMargin - canvas.margin / 2 + canvas.uiBarSize + canvas.margin
        ];

        let highlight: boolean = checkPositionInLimit(new Position(p5.mouseX, p5.mouseY), ...this.limits);
        if (highlight && this.top) {
            p5.fill(60, 200);
            p5.noStroke();
            p5.rect(
                this.limits[0],
                this.limits[2],
                maxBarSize + canvas.margin,
                canvas.uiBarSize + canvas.margin,
                canvas.radius + canvas.padding
            );
        }

        p5.fill(percentageOfBar ? [...this.color.value, this.fade] : [20, 20, 20, this.fade]);
        p5.noStroke();
        p5.rect(
            canvas.margin * 2,
            commonMargin,
            finalElementSize <= 1 ? 1 : finalElementSize,
            canvas.uiBarSize,
            canvas.radius + canvas.padding
        );

        p5.fill(this.color.value);
        p5.stroke(0);
        p5.strokeWeight(3);
        p5.textSize(20);

        p5.textAlign(p5.LEFT, p5.CENTER);
        p5.text(
            this.title,
            canvas.margin * 3,
            commonMargin + (canvas.padding * 0.5),
        );

        p5.textAlign(p5.RIGHT, p5.CENTER);
        p5.text(
            `${formatNumber(Math.floor(this.value))}/${formatNumber(Math.floor(this.maxValue))}`,
            canvas.margin + maxBarSize,
            commonMargin + canvas.padding,
        );
        this.updateAnimation();
    }

    updateAnimation(): void {
        this.frames--;
        this.delta -= this.velocity;
        this.fade -= this.velocityFade;

        if (this.frames === 0) {
            this.delta = 0;
            this.velocity = 0;

            this.fade = 255;
            this.velocityFade = 0;

            if (this.params) {
                this.emit('ProgressBarUpdated:' + this.params.useCase, this.params.data);
            }
        }

    }

    static yourMovesBar(maxValue: number, value: number): ProgressBar {
        return new ProgressBar(
            maxValue,
            value,
            'Your Moves',
            value <= 3 ? new Color(231, 76, 60) : new Color(46, 204, 113),
            false
        );
    }

    static yourHealthBar(maxValue: number, value: number): ProgressBar {
        return new ProgressBar(
            maxValue,
            value,
            'Your Health',
            new Color(231, 76, 60),
            false
        );
    }

    static enemyHealthBar(enemy: Enemy, value: number, count: number): ProgressBar {
        return new ProgressBar(
            enemy.health,
            value,
            enemy.name + ' Health (' + enemy.number + '/' + count + ')',
            enemy.color,
            true
        );
    }

    static stageBar(run: Run): ProgressBar {
        return new ProgressBar(
            run.map.floor.stages.length,
            run.map.stage.number ?? run.map.stageCount,
            'Stage',
            new Color(46, 134, 193),
            true
        );
    }

    static floorBar(run: Run): ProgressBar {
        return new ProgressBar(
            run.map.floors.length,
            run.map.floor.number ?? run.map.floorCount,
            'Floor',
            new Color(244, 208, 63),
            true
        );
    }

}
