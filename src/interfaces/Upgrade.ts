import { ILimits } from "./General";

export interface IUpgrade {
    totalPoints: number;
    xp: number;
    options: IUpgradeOption[]
}

export interface IUpgradeOption {
    property: string,
    points: number,
    maxPoints?: number,
    cost?: number,
    limitsAdd?: ILimits;
    limitsSub?: ILimits;
    formatNumber?: (value: number) => string
    formatValue?: (value: number) => number
}
