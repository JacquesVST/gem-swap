import * as P5 from "p5";
import { Canvas } from "../controllers/Canvas";
import { DragController } from "../controllers/DragController";
import { IDrag } from "../interfaces";
import { dottedLine } from "../utils/Draw";
import { generateId } from "../utils/General";
import { Color } from "./Color";
import { Position } from "./Position";
import { Run } from "./Run";

export class DragAnimation implements IDrag {
    id: string;
    isFading: boolean = false;
    frames: number;

    initialPosition: Position;
    relativePositon: Position;

    initialOpacity: number;
    relativeOpacity: number;
    relativeOpacitySpeed: number;

    constructor(initialPosition: Position, frames: number) {
        this.initialPosition = initialPosition
        this.frames = frames;
        this.id = generateId();

        this.calculateSpeed();
    }

    calculateSpeed(): void {
        this.initialOpacity = 255;
        this.relativeOpacitySpeed = -255 / this.frames;
        this.relativeOpacity = 0;
    }

    draw(run: Run): void {
        const p5: P5 = Canvas.getInstance().p5;

        if (this.relativePositon && this.relativePositon.checksum !== this.initialPosition.checksum) {
            const color: Color = run.player.itemData.omniMoves > 0 ? Color.GREEN : Color.WHITE
            const opacity: number = this.initialOpacity + this.relativeOpacity;

            p5.strokeWeight(Canvas.getInstance().stroke);
            p5.stroke(Color.BLACK.alpha(opacity).value);
            p5.fill(color.alpha(opacity).value);

            const size: number = Canvas.getInstance().gridData.cellSideSize / 3.5;
            const dots: number = dottedLine(this.initialPosition, this.relativePositon, size, size * 1.25, p5);

            if (dots !== run.dots && opacity === 255) {
                run.dots = dots;
                run.sounds['dot'].setVolume(0.2);
                run.sounds['dot'].play();
            }

            if (!DragController.getInstance().isDragging || this.isFading) {
                this.isFading = true;
                this.updateAnimation();
            }
        }
    }

    updateAnimation(): void {
        this.relativeOpacity += this.relativeOpacitySpeed;

        if (this.frames-- === 0) {
            DragController.getInstance().remove(this)
        }
    }
}