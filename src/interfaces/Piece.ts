import { IAnimatable } from "./Animation";
import { IEventParams } from "./EventEmitter";
import { IColor, IPosition } from "./General";
import { ISwapData } from "./Grid";

export interface IPiece extends IAnimatable {
    shape: IShape;
    gridPosition: IPosition;
    cellSideSize: number;
    critical: boolean;
    effect: IEffect;

    renewPosition(position: IPosition): IPiece;

    setupFallAnimation(frames: number, relativePosition: IPosition, params: IFallPieceAnimationParams): void;
    setupRemoveAnimation(frames: number, relativeOpacity: number, params: IRemovePieceAnimationParams): void;
    setupSwapAnimation(frames: number, relativePosition: IPosition, params: ISwapPieceAnimationParams): void;
}

export interface IShape {
    id: string;
    sides: number;
    color: IColor;
    itemData: IShapeItemData;
}

export interface IEffect {
    id: string
    effect: (params: IEffectParams) => void;
    chance: number;
}

export interface IEffectParams {
    piece: IPiece;
    match: IPiece[];
    matches: IPiece[][];
}

export interface IShapeItemData {
    bonusDamage: number;
}

export interface IAnimationParams extends IEventParams {
    data: any;
    useCase: string;
    baseAction: string;
}

export interface IRemovePieceAnimationData {
    callNextAction: boolean;
    position: IPosition;
    matches: IPiece[][];
}

export interface IRemovePieceAnimationParams extends IAnimationParams {
    data: IRemovePieceAnimationData;
}

export interface IFallPieceAnimationData {
    callNextAction: boolean;
    position: IPosition;
    newPosition: IPosition;
    allowMatches: boolean;
}

export interface IFallPieceAnimationParams extends IAnimationParams {
    data: IFallPieceAnimationData;
}

export interface ISwapPieceAnimationData {
    callNextAction: boolean;
    swapData?: ISwapData,
}

export interface ISwapPieceAnimationParams extends IAnimationParams {
    data: ISwapPieceAnimationData;
}