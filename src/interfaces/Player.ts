import { IColor, ILimits } from "./General";
import { IItem, IRelic } from "./Item";
import { IShape } from "./Piece";

export interface IPlayer {
    health: number;
    maxHealth: number;
    moves: number;
    maxMoves: number;
    attack: number;
    defense: number;

    damageMultiplier: number;
    criticalChance: number;
    criticalMultiplier: number;
    critical: number;
    gold: number;
    xp: number;

    hasInventoryOpen: boolean;
    hasStatsOpen: boolean;

    items: IItem[];
    passive: IItem;
    relic: IRelic;
    itemData: IPlayerItemData;
}

export interface IPlayerItemData {
    activeItem: IItem;
    activeItemLimits: ILimits;
    activeItem2: IItem;
    activeItem2Limits: ILimits;
    passiveLimits: ILimits
    relicLimits: ILimits
    bonusMoves: number;
    bossCrits: number;
    diagonals: boolean;
    goldAddCount: number;
    hasShield: boolean;
    hasUsedShield: boolean;
    moveSaverChance: number;
    omniMoves: number;
    reach: number;
    relicMultiplier: number;
    rerolls: number;
    bossMoves: number;
    colorDamageBosts: { [key: string]: IShape };
    damageBoostTimer: IDamageBoostTimerData
}

export interface IDamageBoostTimerData {
    timer: number;
    multiplier: number;
    label: string;
    hasMoved: boolean;
    color: IColor;
    interval: NodeJS.Timeout
}

export interface IDamageData {
    damage: number;
    shielded: boolean;
}