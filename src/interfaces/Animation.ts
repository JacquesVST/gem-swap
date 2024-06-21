import { IColor, IPosition } from "./General";
import { IRun } from "./Run";

export interface IAnimatable {
    animationStatus?: AnimationStatus;
    frames: number;

    initialLinearSize?: number;
    relativeLinearSize?: number;
    relativeLinearSizeSpeed?: number;

    initialOpacity?: number;
    relativeOpacity?: number;
    relativeOpacitySpeed?: number;

    initialPosition?: IPosition;
    relativePosition?: IPosition;
    relativePositionSpeed?: IPosition;

    initialSize?: IPosition;
    relativeSize?: IPosition;
    relativeSizeSpeed?: IPosition;

    draw: (run?: IRun) => void;
    updateAnimation: () => void;
    calculateSpeed: () => void;
}

export interface IDrag extends IAnimatable {
    id: string;
    isFading: boolean;
}

export interface IText extends IAnimatable {
    color: IColor;
    text: string;
    id: string;
}

export enum AnimationStatus {
    FINISHED,
    IN_PROGRESS,
    NOT_STARTED,
}

