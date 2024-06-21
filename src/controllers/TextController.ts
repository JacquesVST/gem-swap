import { IDamageData } from "../interfaces";
import { Color } from "../models/Color";
import { Position } from "../models/Position";
import { Shape } from "../models/Shape";
import { TextAnimation } from "../models/TextAnimation";
import { Canvas } from "./Canvas";
import { EventEmitter } from "./EventEmitter";

export class TextController extends EventEmitter {
    private static instance: TextController;

    textAnimations: TextAnimation[];
    canvas: Canvas;

    private constructor() {
        super('TextController');
        this.canvas = Canvas.getInstance();
        this.textAnimations = [];
    }

    static getInstance(): TextController {
        if (!TextController.instance) {
            TextController.instance = new TextController();
        }
        return TextController.instance;
    }

    draw(): void {
        this.textAnimations.forEach((animation: TextAnimation) => {
            animation.draw();
        });
    }

    clear(): void {
        this.textAnimations = [];
    }

    remove(textAnimation: TextAnimation): void {
        this.textAnimations = this.textAnimations.filter((animation: TextAnimation) => animation.id !== textAnimation.id);
    }

    damageAnimation(damage: number, criticalInMatch: boolean, positon: Position, mainShape?: Shape): void {
        const color: Color = mainShape ? mainShape.color : Color.WHITE_1;

        const varianceX: number = Math.ceil(Math.random() * 50) * (Math.round(Math.random()) ? 1 : -1);
        const varianceY: number = Math.ceil(Math.random() * 50) * (Math.round(Math.random()) ? 1 : -1);

        const animation: TextAnimation = new TextAnimation(
            `${damage} DMG${criticalInMatch ? '!' : ''}`,
            color,
            120,
            Position.of(positon.x + varianceX, positon.y + varianceY),
            Position.of(0, -100),
            20 * (criticalInMatch ? 2 : 1),
            10 * (criticalInMatch ? 2 : 1)
        );

        this.textAnimations.push(animation);
    }

    damagePlayerAnimation(damage: IDamageData): void {
        const animation: TextAnimation = new TextAnimation(
            damage.shielded ? 'Shielded' : `-${Math.floor(damage.damage)} HP`,
            damage.shielded ? Color.GREEN : Color.RED,
            180,
            Position.of(this.canvas.windowSize.x / 2, this.canvas.windowSize.y - this.canvas.uiData.bottomUiSize),
            Position.of(0, 200)
        );

        this.textAnimations.push(animation);
    }

    goldAnimation(amount: number) {
        const canvas: Canvas = Canvas.getInstance();

        const varianceX: number = Math.ceil(Math.random() * 50) * (Math.round(Math.random()) ? 1 : -1);
        const varianceY: number = Math.ceil(Math.random() * 50) * (Math.round(Math.random()) ? 1 : -1);

        const position: Position = Position.of(
            canvas.windowSize.x - canvas.margin - ((canvas.margin * 1.5 + canvas.itemSideSize + canvas.gridData.horizontalCenterPadding / 2 - canvas.padding) / 2) + varianceX,
            canvas.windowSize.y / 2 + canvas.itemSideSize / 4 * 1.5 + canvas.margin * 1.5 + varianceY,
        );

        let textAnimation: TextAnimation;
        if (amount > 0) {
            textAnimation = new TextAnimation(
                `+${amount} Gold`,
                Color.YELLOW,
                180,
                position,
                Position.of(0, -100),
                20,
                10
            );
        }

        if (amount < 0) {
            textAnimation = new TextAnimation(
                `${amount} Gold`,
                Color.RED,
                180,
                Position.of(this.canvas.p5.mouseX + varianceX, this.canvas.p5.mouseY + varianceY),
                Position.of(0, 100)
            );
        }

        this.textAnimations.push(textAnimation);
    }

    moveSavedAnimation(): void {
        const animation: TextAnimation = new TextAnimation(
            `Move saved`,
            Color.GREEN,
            120,
            Position.of(this.canvas.p5.mouseX, this.canvas.p5.mouseY),
            Position.of(0, -200)
        );

        this.textAnimations.push(animation);
    }

    playerHealedAnimation(amount: number): void {
        if (amount > 0) {
            amount = Math.floor(amount);
            const animation: TextAnimation = new TextAnimation(
                `+${amount}`,
                Color.GREEN,
                120,
                Position.of(this.canvas.p5.mouseX, this.canvas.p5.mouseY),
                Position.of(0, -200)
            );

            this.textAnimations.push(animation);
        }
    }

    bossFightAnimation(): void {
        const animation: TextAnimation = new TextAnimation(
            `Boss Fight`,
            Color.PURPLE,
            120,
            Position.of(this.canvas.windowSize.x / 2, this.canvas.windowSize.y / 2),
            Position.of(0, 0),
            60,
            -40
        );

        this.textAnimations.push(animation);
    }

    newFloorAnimation(): void {
        const animation: TextAnimation = new TextAnimation(
            `New Floor Reached`,
            Color.YELLOW,
            120,
            Position.of(this.canvas.windowSize.x / 2, this.canvas.uiData.topUiSize),
            Position.of(0, 100),
            40,
            40
        );

        this.textAnimations.push(animation);
    }


}