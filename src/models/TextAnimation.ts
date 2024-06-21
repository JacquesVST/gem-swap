import * as P5 from "p5";
import { Canvas } from "../controllers/Canvas";
import { TextController } from "../controllers/TextController";
import { IText } from "../interfaces";
import { generateId } from "../utils/General";
import { Color } from "./Color";
import { Position } from "./Position";

export class TextAnimation implements IText {
    id: string;
    text: string;
    color: Color;

    frames: number;

    initialLinearSize: number;
    relativeLinearSize: number;
    relativeLinearSizeSpeed: number;

    initialOpacity: number;
    relativeOpacity: number;
    relativeOpacitySpeed: number;

    initialPosition: Position = Position.ORIGIN;
    relativePosition: Position = Position.ORIGIN;
    relativePositionSpeed: Position = Position.ORIGIN;

    constructor(text: string, color: Color, frames: number, initialPosition: Position, relativePositon: Position, initialLinearSize: number = 20, relativeLinearSize: number = 0) {
        this.id = generateId();
        this.text = text;
        this.color = color;

        this.frames = frames;

        this.initialPosition = initialPosition;
        this.relativePosition = relativePositon;

        this.initialLinearSize = initialLinearSize;
        this.relativeLinearSize = relativeLinearSize;

        this.calculateSpeed();
    }

    calculateSpeed(): void {
        this.initialOpacity = 200;
        this.relativeOpacitySpeed = -200 / this.frames;
        this.relativeOpacity = 0

        this.relativePositionSpeed = this.relativePosition.divide(this.frames);
        this.relativePosition = Position.ORIGIN

        this.relativeLinearSizeSpeed = this.relativeLinearSize / this.frames;
        this.relativeLinearSize = 0
    }

    draw(): void {
        const p5: P5 = Canvas.getInstance().p5;

        const opacity: number = this.initialOpacity + this.relativeOpacity;

        p5.fill(this.color.alpha(opacity).value);
        p5.stroke(Color.BLACK.alpha(opacity).value)
        p5.strokeWeight(Canvas.getInstance().stroke);

        p5.textSize(this.initialLinearSize + this.relativeLinearSize);
        p5.textAlign(p5.CENTER, p5.CENTER);
        p5.text(
            this.text,
            this.initialPosition.x + this.relativePosition.x,
            this.initialPosition.y + this.relativePosition.y
        );
        p5.noStroke();
        this.updateAnimation();
    }

    updateAnimation(): void {
        this.relativePosition = this.relativePosition.sum(this.relativePositionSpeed);
        this.relativeOpacity += this.relativeOpacitySpeed
        this.relativeLinearSize += this.relativeLinearSizeSpeed;

        if (this.frames-- === 0) {
            TextController.getInstance().remove(this)
        }
    }
}

