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
    rerollButton: ILimits;
}

export interface IDialogOption {
    color: IColor;
    limits: ILimits;
    disabled: boolean;
}

export enum DialogType {
    CUSTOM_RUN,
    INITIAL,
    ITEM,
    NAVIGATION,
    SHOP,
    SKIPPABLE_ITEM,
    UPGRADES,
}
