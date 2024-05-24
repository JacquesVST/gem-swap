import { EventEmitter, EventParams } from "./EventEmitter";
import { SwapData } from "./Grid";
import { Piece } from "./Piece";
import { Position } from "./Position";

export class PieceAnimation extends EventEmitter {
    relativeEndPosition: Position = new Position(0, 0);
    frames: number = 0;
    velocityX: number = 0;
    velocityY: number = 0;
    velocityFade: number = 0;
    additiveFade: number = 0;
    relativeFade: number = 0;

    constructor() {
        super();
    }

    setupFallAnimation(frames: number, relativeEndPosition: Position, params: FallPieceAnimationParams): void {
        this.params = params;
        this.frames = frames;
        this.relativeEndPosition = relativeEndPosition;
        this.calculateVelocity();
    }

    setupRemoveAnimation(frames: number, relativeFade: number, params: RemovePieceAnimationParams): void {
        this.params = params;
        this.frames = frames;
        this.relativeFade = relativeFade;
        this.calculateVelocity();
    }

    setupSwapAnimation(frames: number, relativeEndPosition: Position, params: SwapPieceAnimationParams): void {
        this.params = params;
        this.frames = frames;
        this.relativeEndPosition = relativeEndPosition;
        this.calculateVelocity();
    }

    calculateVelocity(): void {
        this.emit('StartedAnimation');
        this.velocityX = this.relativeEndPosition.x / this.frames;
        this.velocityY = this.relativeEndPosition.y / this.frames;
        this.velocityFade = this.relativeFade / this.frames;
    }

    updatePosition(): void {
        if (this.relativeEndPosition && this.frames) {

            this.relativeEndPosition.x -= this.velocityX;
            this.relativeEndPosition.y -= this.velocityY;
            this.additiveFade += this.velocityFade;

            this.frames--;
            if (this.frames === 0) {
                this.resetAnimationDeltas();
            }
        }
    }

    resetAnimationDeltas(): void {
        if (this.params) {
            this.emit(this.params.baseAction + (this.params.useCase ? `:${this.params.useCase}` : ''), this.params);
        }
        this.emit('AnimationEnded');

        this.relativeEndPosition = new Position(0, 0);
        this.relativeFade = 0;
        this.additiveFade = 0;
        this.velocityX = 0;
        this.velocityY = 0;
        this.velocityFade = 0;
        this.params = undefined;

    }
}

export enum AnimationStatus {
    FINISHED,
    IN_PROGRESS,
    NOT_STARTED,
}

export enum AnimationType {
    FALL,
    REMOVE,
    SWAP,
}

export class AnimationParams implements EventParams {
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