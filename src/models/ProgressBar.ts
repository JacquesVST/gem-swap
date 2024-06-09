import * as P5 from "p5";
import { Canvas } from "../controllers/Canvas";
import { EventEmitter } from "../controllers/EventEmitter";
import { IEventParams, IProgressBar } from "../interfaces";
import { endShadow, fillStroke, icon, startShadow } from "../utils/Draw";
import { formatNumber } from "../utils/General";
import { Color } from "./Color";
import { Icon } from "./Icon";
import { Limits } from "./Limits";
import { Position } from "./Position";
import { Run } from "./Run";

export class ProgressBar extends EventEmitter implements IProgressBar {
    maxValue: number;
    value: number;
    title: string;
    color: Color;

    index: number;
    top: boolean;
    limits: Limits;
    icon: Icon;

    frames: number = 0;
    relativeLinearSizeSpeed: number = 0;
    relativeLinearSize: number = 0;
    initialLinearSize: number = 0;

    constructor(maxValue: number, value: number, title: string, color: Color, top: boolean, index: number, icon?: Icon) {
        super('ProgressBar');
        this.maxValue = maxValue;
        this.value = value;
        this.title = title;
        this.color = color;
        this.top = top;
        this.index = index;
        this.icon = icon;

        this.calculateSpeed()
    }

    calculateSpeed(): void {

    }

    animate(relativeLinearSize: number, params: IEventParams): void {
        this.frames = 10;
        this.relativeLinearSize = relativeLinearSize;
        this.relativeLinearSizeSpeed = relativeLinearSize / this.frames;
        this.params = params;
        this.calculateSpeed();
    }

    draw(run?: Run): void {
        const canvas: Canvas = Canvas.getInstance();
        const p5: P5 = canvas.p5;

        let commonMargin: number;
        if (this.top) {
            commonMargin = (canvas.margin * (this.index + 2)) + (canvas.uiData.uiBarSize * this.index) + canvas.margin / 2;
        } else {
            let bottomIndex: number = this.index - (canvas.uiData.topBarCount - 1);
            commonMargin = canvas.windowSize.y - canvas.margin - canvas.uiData.bottomUiSize + (canvas.uiData.uiBarSize * bottomIndex) + (canvas.margin * bottomIndex) + canvas.margin / 2;
        }


        const drawingContext: CanvasRenderingContext2D = p5.drawingContext as CanvasRenderingContext2D;

        startShadow(drawingContext);

        const percentageOfBar: number = (this.value + this.relativeLinearSize) / this.maxValue;
        const maxBarSize: number = (canvas.playfield.x - (2 * canvas.margin));
        const finalElementSize: number = (maxBarSize * percentageOfBar) > maxBarSize ? maxBarSize : (maxBarSize * percentageOfBar);

        this.limits = new Limits(Position.of(canvas.margin * 1.5, commonMargin - canvas.margin / 2), Position.of(canvas.playfield.x - canvas.margin * 1.5, commonMargin - canvas.margin / 2 + canvas.uiData.uiBarSize + canvas.margin))

        if (this.limits.contains(canvas.mousePosition) && this.top) {
            p5.fill(Color.GRAY_3.alpha(200).value);
            p5.noStroke();
            p5.rect(
                canvas.margin * 1.5,
                commonMargin - canvas.margin / 2,
                maxBarSize + canvas.margin,
                canvas.uiData.uiBarSize + canvas.margin,
                canvas.radius + canvas.padding
            );
        }

        p5.fill((percentageOfBar ? this.color : Color.GRAY_1).value);
        p5.noStroke();
        p5.rect(
            canvas.margin * 2,
            commonMargin,
            finalElementSize <= 1 ? 1 : finalElementSize,
            canvas.uiData.uiBarSize,
            canvas.radius + canvas.padding
        );

        fillStroke(this.color)
        p5.textSize(canvas.uiData.fontText);

        p5.textAlign(p5.LEFT, p5.CENTER);
        p5.text(
            this.title,
            canvas.margin * 3,
            commonMargin + (canvas.padding * 0.5),
        );

        const width = p5.textWidth(this.title);

        p5.textAlign(p5.LEFT, p5.CENTER);
        icon(this.icon, Position.of(width + canvas.margin * 4, commonMargin + (canvas.padding * 0.5)));

        p5.textAlign(p5.RIGHT, p5.CENTER);
        p5.text(
            `${formatNumber(Math.floor(this.value))}/${formatNumber(Math.floor(this.maxValue))}`,
            canvas.margin + maxBarSize,
            commonMargin + canvas.padding,
        );

        endShadow(drawingContext);

        this.updateAnimation();
    }

    updateAnimation(): void {
        this.frames--;
        this.relativeLinearSize -= this.relativeLinearSizeSpeed;

        if (this.frames === 0) {
            this.relativeLinearSize = 0;
            this.relativeLinearSizeSpeed = 0;

            if (this.params) {
                this.emit('ProgressBarUpdated:' + this.params.useCase, this.params.data);
            }
        }

    }



}
