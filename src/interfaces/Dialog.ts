import { IAnimatable } from "./Animation";
import { IColor, ILimits } from "./General";

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
