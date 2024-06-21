import * as P5 from "p5";
import { Canvas } from "../controllers/Canvas";
import { EventEmitter } from "../controllers/EventEmitter";
import { IEventParams, IPiece, IPosition } from "../interfaces";
import { endShadow, fillFlat, fillStroke, polygon, startShadow } from "../utils/Draw";
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
    mouseOver: boolean = false;

    frames: number = 0;
    initialPosition: Position = Position.ORIGIN;
    relativePosition: Position = Position.ORIGIN;
    relativePositionSpeed: Position = Position.ORIGIN;

    initialOpacity: number = 0;
    relativeOpacity: number = 0
    relativeOpacitySpeed: number = 0

    relativeLinearSize: number = 0;
    relativeLinearSizeSpeed: number = 0

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
        this.relativePosition = Position.ORIGIN
        return this;
    }

    setupFallAnimation(frames: number, relativePosition: Position, params: FallPieceAnimationParams): void {
        this.params = params;
        this.frames = frames;
        this.relativePosition = relativePosition;
        this.calculateSpeed();
    }

    setupRemoveAnimation(frames: number, relativeOpacity: number, params: RemovePieceAnimationParams): void {
        this.params = params;
        this.frames = frames;
        this.relativePosition = Position.ORIGIN;
        this.relativeOpacity = relativeOpacity;
        this.calculateSpeed();
    }

    setupSwapAnimation(frames: number, relativePosition: Position, params: SwapPieceAnimationParams): void {
        this.params = params;
        this.frames = frames;
        this.relativePosition = relativePosition;
        this.calculateSpeed();
    }

    calculateSpeed(): void {
        this.emit('StartedAnimation');
        this.relativePositionSpeed = this.relativePosition.divide(this.frames)
        this.relativePosition = Position.ORIGIN;
        this.relativeOpacitySpeed = this.relativeOpacity / this.frames;
        this.relativeOpacity = 0;
    }

    draw(): void {
        const canvas: Canvas = Canvas.getInstance();
        const p5: P5 = canvas.p5;

        const drawingContext: CanvasRenderingContext2D = p5.drawingContext as CanvasRenderingContext2D;

        startShadow(drawingContext)

        fillStroke(this.shape.color, 255 - this.initialOpacity)
        polygon(
            this.initialPosition.x + (this.cellSideSize / 2) + this.relativePosition.x,
            this.initialPosition.y + (this.cellSideSize / 2) + this.relativePosition.y,
            (this.cellSideSize / 3) + this.relativeLinearSize,
            this.shape.sides,
            p5
        );
        endShadow(drawingContext)

        if (this.critical) {
            p5.textAlign(p5.CENTER, p5.CENTER);
            fillFlat(Color.BLACK);
            p5.textSize(canvas.uiData.fontTitle);
            p5.text(
                '!',
                this.initialPosition.x + (this.cellSideSize / 2) + this.relativePosition.x,
                this.initialPosition.y + (this.cellSideSize / 2) + this.relativePosition.y,
            );
        }

        this.updateAnimation();
    }

    updateAnimation(): void {
        const canvas: Canvas = Canvas.getInstance();
        this.relativeLinearSizeSpeed = canvas.scale(0.001);

        if (this.mouseOver && this.relativeLinearSize <= canvas.scale(0.005)) {
            this.relativeLinearSize += this.relativeLinearSizeSpeed
        }

        if (!this.mouseOver && this.relativeLinearSize > 0) {
            this.relativeLinearSize -= this.relativeLinearSizeSpeed
        }

        if (this.frames) {
            this.relativePosition = this.relativePosition.minus(this.relativePositionSpeed);
            this.initialOpacity += this.relativeOpacitySpeed;

            this.frames--;
            if (this.frames === 0) {

                if (this.params) {
                    this.emit(this.params.baseAction + (this.params.useCase ? `:${this.params.useCase}` : ''), this.params);
                }
                this.emit('AnimationEnded');

                this.relativePosition = Position.ORIGIN;
                this.relativePositionSpeed = Position.ORIGIN;

                this.relativeOpacity = 0;
                this.relativeOpacitySpeed = 0;

                this.relativeLinearSize = 0;
                this.relativeLinearSizeSpeed = 0;
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
    useCase: string;
}

export class FallPieceAnimationParams extends AnimationParams {
    data: FallPieceAnimationData;

    constructor(data?: FallPieceAnimationData) {
        super('FallAnimationEnded');
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