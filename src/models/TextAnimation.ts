import * as P5 from "p5";
import { generateId } from "../utils/Functions";
import { CanvasInfo } from "./CanvasInfo";
import { DamageData } from "./Character";
import { Color } from "./Color";
import { Position } from "./Position";
import { Enemy } from "./Enemy";

export class TextAnimation {
    text: string;
    size: number;
    color: Color;
    stroke: number;
    align: P5.LEFT | P5.CENTER | P5.RIGHT;
    initialPosition: Position;
    relativeEndPosition: Position;
    frames: number;
    relativeSize: number;
    id: string;

    fade: number = 200;
    velocityX: number = 0;
    velocityY: number = 0;
    velocityFade: number = 0;
    velocitySize: number = 0;

    constructor(text: string, size: number, color: Color, stroke: number, align: P5.LEFT | P5.CENTER | P5.RIGHT, initialPosition: Position, relativeEndPosition: Position, frames: number, relativeSize: number = 0) {
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

        this.calculateVelocity();
    }

    calculateVelocity(): void {
        this.velocityX = this.relativeEndPosition.x / this.frames;
        this.velocityY = this.relativeEndPosition.y / this.frames;
        this.velocityFade = this.fade / this.frames;
        this.velocitySize = this.relativeSize / this.frames;
    }

    draw(p5: P5, textAnimationController: TextAnimationController): void {
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
        this.updatePosition(textAnimationController);
    }

    updatePosition(textAnimationController: TextAnimationController): void {
        this.initialPosition.x += this.velocityX;
        this.initialPosition.y += this.velocityY;
        this.fade -= this.velocityFade;
        this.size += this.velocitySize;

        if (this.frames-- === 0) {
            textAnimationController.remove(this);
        }
    }
}

export class TextAnimationController {
    textAnimations: TextAnimation[]
    canvas: CanvasInfo;

    constructor(canvas: CanvasInfo) {
        this.canvas = canvas;
        this.textAnimations = [];
    }

    draw(): void {
        this.textAnimations.forEach((animation: TextAnimation) => {
            animation.draw(this.canvas.p5, this);
        });
    }

    clear(): void {
        this.textAnimations = [];
    }

    remove(textAnimation: TextAnimation): void {
        this.textAnimations = this.textAnimations.filter((animation: TextAnimation) => animation.id !== textAnimation.id);
    }

    damageAnimation(damage: number, enemy: Enemy, positon: Position): void {
        let overkill: boolean = damage >= enemy.currentHealth;

        let varianceX: number = Math.ceil(Math.random() * 50) * (Math.round(Math.random()) ? 1 : -1)
        let varianceY: number = Math.ceil(Math.random() * 50) * (Math.round(Math.random()) ? 1 : -1)

        let textAnimation: TextAnimation = new TextAnimation(
            `${damage} DMG`,
            20,
            overkill ? new Color(231, 76, 60) : new Color(224, 224, 224),
            4,
            this.canvas.p5.CENTER,
            new Position(positon.x + varianceX, positon.y + varianceY),
            new Position(0, -200),
            180
        );

        this.textAnimations.push(textAnimation);
    }

    damagePlayerAnimation(damage: DamageData): void {
        let textAnimation: TextAnimation = new TextAnimation(
            damage.shielded ? 'Shielded' : `-${Math.floor(damage.damage)} HP`,
            20,
            damage.shielded ? new Color(101, 206, 80) : new Color(231, 76, 60),
            4,
            this.canvas.p5.CENTER,
            new Position(this.canvas.canvasSize.x / 2, this.canvas.canvasSize.y - this.canvas.bottomUiSize),
            new Position(0, 200),
            180
        );

        this.textAnimations.push(textAnimation);
    }

    goldAnimation(amount: number) {
        let varianceX: number = Math.ceil(Math.random() * 50) * (Math.round(Math.random()) ? 1 : -1)
        let varianceY: number = Math.ceil(Math.random() * 50) * (Math.round(Math.random()) ? 1 : -1)

        let textAnimation: TextAnimation;
        if (amount > 0) {

            textAnimation = new TextAnimation(`+${amount} Gold`,
                20,
                new Color(244, 208, 63),
                4,
                this.canvas.p5.CENTER,
                new Position((this.canvas.canvasSize.x / 2) + varianceX, (this.canvas.topUiSize - this.canvas.uiBarSize - this.canvas.margin) + varianceY),
                new Position(0, 100),
                180
            );
        }

        if (amount < 0) {
            textAnimation = new TextAnimation(
                `${amount} Gold`,
                20,
                new Color(231, 76, 60),
                4,
                this.canvas.p5.CENTER,
                new Position(this.canvas.p5.mouseX + varianceX, this.canvas.p5.mouseY + varianceY),
                new Position(0, 100),
                180
            );
        }

        this.textAnimations.push(textAnimation);
    }

    moveSavedAnimation(): void {
        let floorComplete: TextAnimation = new TextAnimation(
            `Move saved`,
            20,
            new Color(101, 206, 80),
            4,
            this.canvas.p5.CENTER,
            new Position(this.canvas.p5.mouseX, this.canvas.p5.mouseY),
            new Position(0, -200),
            240,
        );

        this.textAnimations.push(floorComplete);
    }

    bossFightAnimation(): void {
        let floorComplete: TextAnimation = new TextAnimation(
            `Boss Fight`,
            60,
            new Color(87, 49, 214),
            4,
            this.canvas.p5.CENTER,
            new Position(this.canvas.canvasSize.x / 2, this.canvas.canvasSize.y / 2),
            new Position(0, 0),
            240,
            -40
        );

        this.textAnimations.push(floorComplete);
    }

    newFloorAnimation(): void {
        let floorComplete: TextAnimation = new TextAnimation(
            `Floor Complete`,
            40,
            new Color(224, 224, 224),
            4,
            this.canvas.p5.CENTER,
            new Position(this.canvas.canvasSize.x / 2, this.canvas.canvasSize.y / 2 + this.canvas.topUiSize),
            new Position(0, -200),
            240
        );

        this.textAnimations.push(floorComplete);
    }
}