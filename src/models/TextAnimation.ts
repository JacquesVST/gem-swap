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
    relativePositon: Position = Position.ORIGIN;
    relativePositonSpeed: Position = Position.ORIGIN;

    constructor(text: string, color: Color, frames: number, initialPosition: Position, relativePositon: Position, initialLinearSize: number = 20, relativeLinearSize: number = 0) {
        this.id = generateId();
        this.text = text;
        this.color = color;

        this.frames = frames;

        this.initialPosition = initialPosition;
        this.relativePositon = relativePositon;

        this.initialLinearSize = initialLinearSize;
        this.relativeLinearSize = relativeLinearSize;

        this.calculateSpeed();
    }

    calculateSpeed(): void {
        this.initialOpacity = 200;
        this.relativeOpacitySpeed = -200 / this.frames;
        this.relativeOpacity = 0

        this.relativePositonSpeed = this.relativePositon.divide(this.frames);
        this.relativePositon = Position.ORIGIN

        this.relativeLinearSizeSpeed = this.relativeLinearSize / this.frames;
        this.relativeLinearSize = 0
    }

    draw(): void {
        const p5: P5 = Canvas.getInstance().p5;

        const opacity: number = this.initialOpacity + this.relativeOpacity;

        p5.fill(this.color.alpha(opacity).value);
        p5.stroke(Color.BLACK.alpha(opacity).value)
        p5.strokeWeight(3);

        p5.textSize(this.initialLinearSize + this.relativeLinearSize);
        p5.textAlign(p5.CENTER, p5.CENTER);
        p5.text(
            this.text,
            this.initialPosition.x + this.relativePositon.x,
            this.initialPosition.y + this.relativePositon.y
        );
        p5.noStroke();
        this.updateAnimation();
    }

    updateAnimation(): void {
        this.relativePositon = this.relativePositon.sum(this.relativePositonSpeed);
        this.relativeOpacity += this.relativeOpacitySpeed
        this.relativeLinearSize += this.relativeLinearSizeSpeed;

        if (this.frames-- === 0) {
            TextController.getInstance().remove(this)
        }
    }
}

