import * as p5 from "p5";
import { Color } from "./Color";
import { Position } from "./Position";
import { generateId } from "../utils/Functions";

export class TextAnimation {
    text: string;
    size: number;
    color: Color;
    stroke: number;
    align: p5.LEFT | p5.CENTER | p5.RIGHT;
    initialPosition: Position;
    relativeEndPosition: Position;
    relativeSize: number;
    frames: number;
    id: string;
    fade: number;
    velocityX: number;
    velocityY: number;
    velocityFade: number;
    velocitySize: number;

    constructor(text: string, size: number, color: Color, stroke: number, align: p5.LEFT | p5.CENTER | p5.RIGHT, initialPosition: Position, relativeEndPosition: Position, frames: number, relativeSize: number = 0) {
        this.text = text;
        this.size = size;
        this.color = color;
        this.stroke = stroke;
        this.align = align;
        this.initialPosition = initialPosition;
        this.relativeEndPosition = relativeEndPosition;
        this.relativeSize = relativeSize;
        this.frames = frames;
        this.id = generateId();

        this.fade = 200;
        this.velocityX = 0;
        this.velocityY = 0;
        this.velocityFade = 0;
        this.calculateVelocity();
    }

    calculateVelocity(): void {
        this.velocityX = this.relativeEndPosition.x / this.frames;
        this.velocityY = this.relativeEndPosition.y / this.frames;
        this.velocityFade = this.fade / this.frames;
        this.velocitySize = this.relativeSize / this.frames;
    }

    draw(p5: p5, globalAnimations: TextAnimation[]): void {
        p5.fill(...this.color.value, this.fade);
        if (this.stroke > 0) {
            p5.stroke(0, 0, 0, this.fade);
            p5.strokeWeight(this.stroke);
        } else {
            p5.noStroke();
        }

        p5.textSize(this.size);
        p5.textAlign(this.align);
        p5.text(
            this.text,
            this.initialPosition.x,
            this.initialPosition.y
        );
        p5.noStroke();
        this.updatePosition(globalAnimations);
    }

    updatePosition(globalAnimations: TextAnimation[]): void {
        this.initialPosition.x += this.velocityX;
        this.initialPosition.y += this.velocityY;
        this.fade -= this.velocityFade;
        this.size += this.velocitySize;

        if (this.frames-- === 0) {
            globalAnimations = globalAnimations.filter((animation: TextAnimation) => animation.id !== this.id);
        }
    }
}
