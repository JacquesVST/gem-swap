import { IAnimatable } from "./Animation";
import { IColor, ILimits, IPosition } from "./General";
import { IRun } from "./Run";

export interface IDialog extends IAnimatable {
    id: string;
    title: string;
    message: string;
    options: IDialogOption[];
    textColor: IColor;
    type: DialogType;
}

export interface IDialogOption {
    color: IColor;
    limits: ILimits;
    disabled: boolean;
}

export enum DialogType {
    CHOICE,
    INITIAL,
    ITEM,
    NAVIGATION,
    SHOP,
    SKIPPABLE_ITEM,
}

export interface IButton {
    id: string;
    size: IPosition;
    color: IColor;
    limits: ILimits;
    position: IPosition;
    disabled: boolean;
    
    content: (...params: any) => void;
    action: (...params: any) => void;
    draw: (run?: IRun) => void;
}