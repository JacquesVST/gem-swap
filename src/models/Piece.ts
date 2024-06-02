import * as P5 from "p5";
import { Canvas } from "../controllers/Canvas";
import { EventEmitter } from "../controllers/EventEmitter";
import { IEventParams, IPiece, IPosition } from "../interfaces";
import { fillFlat, fillStroke, polygon } from "../utils/Draw";
import { Color } from "./Color";
import { Effect } from "./Effect";
import { SwapData } from "./Grid";
import { Position } from "./Position";
import { Run } from "./Run";
import { Shape } from "./Shape";

export class Piece extends EventEmitter implements IPiece {
    shape: Shape;
    gridPosition: Position;
    cellSideSize: number;
    effect: Effect;
    critical: boolean = false;

    frames: number = 0;
    initialPosition: Position = Position.ORIGIN;
    relativePositon: Position = Position.ORIGIN;
    relativePositonSpeed: Position = Position.ORIGIN;

    initialOpacity: number = 0;
    relativeOpacity: number = 0
    relativeOpacitySpeed: number = 0

    constructor(shape: Shape, position: Position, cellSideSize: number) {
        super('Piece');
        this.shape = shape;
        this.gridPosition = position;
        this.cellSideSize = cellSideSize;
    }

    static generateRandomPiece(position: Position, run: Run): Piece {
        const randomShape = Math.floor(Math.random() * run.possibleShapes.length);
        const shape = run.possibleShapes[randomShape];
        const piece: Piece = new Piece(shape, position, Canvas.getInstance().gridData.cellSideSize);

        run.possibleEffects.forEach((effect: Effect) => {
            const chance: number = Math.random();
            if (chance <= effect.chance) {
                piece.effect = effect;
            }
        });

        return piece;
    }

    renewPosition(position: IPosition): Piece {
        this.gridPosition = Position.of(position.x, position.y);
        this.relativePositon = Position.ORIGIN
        return this;
    }

    setupFallAnimation(frames: number, relativePositon: Position, params: FallPieceAnimationParams): void {
        this.params = params;
        this.frames = frames;
        this.relativePositon = relativePositon;
        this.calculateSpeed();
    }

    setupRemoveAnimation(frames: number, relativeOpacity: number, params: RemovePieceAnimationParams): void {
        this.params = params;
        this.frames = frames;
        this.relativePositon = Position.ORIGIN;
        this.relativeOpacity = relativeOpacity;
        this.calculateSpeed();
    }

    setupSwapAnimation(frames: number, relativePositon: Position, params: SwapPieceAnimationParams): void {
        this.params = params;
        this.frames = frames;
        this.relativePositon = relativePositon;
        this.calculateSpeed();
    }

    calculateSpeed(): void {
        this.emit('StartedAnimation');
        this.relativePositonSpeed = this.relativePositon.divide(this.frames)
        this.relativePositon = Position.ORIGIN;
        this.relativeOpacitySpeed = this.relativeOpacity / this.frames;
        this.relativeOpacity = 0;
    }

    draw(): void {
        const canvas: Canvas = Canvas.getInstance();
        const p5: P5 = canvas.p5;

        const drawingContext: CanvasRenderingContext2D = p5.drawingContext as CanvasRenderingContext2D;

        drawingContext.shadowOffsetX = 5;
        drawingContext.shadowOffsetY = 5;
        drawingContext.shadowBlur = 10;
        drawingContext.shadowColor = 'rgba(0, 0, 0, 0.5)';

        fillStroke(this.shape.color, 255 - this.initialOpacity)
        polygon(
            this.initialPosition.x + (this.cellSideSize / 2) + this.relativePositon.x,
            this.initialPosition.y + (this.cellSideSize / 2) + this.relativePositon.y,
            this.cellSideSize / 3,
            this.shape.sides,
            p5
        );

        drawingContext.shadowOffsetX = 0;
        drawingContext.shadowOffsetY = 0;
        drawingContext.shadowBlur = 0;
        drawingContext.shadowColor = 'rgba(0, 0, 0, 0)'

        if (this.critical) {
            p5.textAlign(p5.CENTER, p5.CENTER);
            fillFlat(Color.BLACK);
            p5.textSize(canvas.uiData.fontTitle);
            p5.text(
                '!',
                this.initialPosition.x + (this.cellSideSize / 2) + this.relativePositon.x,
                this.initialPosition.y + (this.cellSideSize / 2) + this.relativePositon.y,
            );
        }



        this.updateAnimation();
    }

    updateAnimation(): void {
        if (this.frames) {
            this.relativePositon = this.relativePositon.minus(this.relativePositonSpeed);
            this.initialOpacity += this.relativeOpacitySpeed;

            this.frames--;
            if (this.frames === 0) {

                if (this.params) {
                    this.emit(this.params.baseAction + (this.params.useCase ? `:${this.params.useCase}` : ''), this.params);
                }
                this.emit('AnimationEnded');

                this.relativePositon = Position.ORIGIN;
                this.relativePositonSpeed = Position.ORIGIN;

                this.relativeOpacity = 0;
                this.relativeOpacitySpeed = 0;
            }
        }
    }

}

export class AnimationParams implements IEventParams {
    data: any;
    useCase: string;
    baseAction: string;

    constructor(baseAction: string) {
        this.baseAction = baseAction;
    }
}

export interface RemovePieceAnimationData {
    callNextAction: boolean;
    position: Position;
    matches: Piece[][];
}

export class RemovePieceAnimationParams extends AnimationParams {
    data: RemovePieceAnimationData;

    constructor(useCase: string, data?: RemovePieceAnimationData) {
        super('RemoveAnimationEnded');
        this.useCase = useCase;
        this.data = data;
    }
}

export interface FallPieceAnimationData {
    callNextAction: boolean;
    position: Position;
    newPosition: Position;
    allowMatches: boolean;
}

export class FallPieceAnimationParams extends AnimationParams {
    data: FallPieceAnimationData;

    constructor(useCase: string, data?: FallPieceAnimationData) {
        super('FallAnimationEnded');
        this.useCase = useCase;
        this.data = data;
    }
}

export interface SwapPieceAnimationData {
    callNextAction: boolean;
    swapData?: SwapData,
}

export class SwapPieceAnimationParams extends AnimationParams {
    data: SwapPieceAnimationData;

    constructor(data?: SwapPieceAnimationData) {
        super('SwapAnimationEnded');
        this.data = data;
    }
}