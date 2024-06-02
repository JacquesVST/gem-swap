import { ILimits } from "./General";
import { IItem } from "./Item";
import { IShape } from "./Piece";

export interface IPlayer {
    health: number;
    maxHealth: number;
    moves: number;
    maxMoves: number;
    attack: number;
    defense: number;

    damageMultiplier: number;
    criticalMultiplier: number;
    critical: number;
    gold: number;
    xp: number;

    hasInventoryOpen: boolean;
    hasStatsOpen: boolean;

    items: IItem[];
    passive: IItem;
    itemData: IPlayerItemData;
}

export interface IPlayerItemData {
    activeItem: IItem;
    activeItemLimits: ILimits;
    activeItem2: IItem;
    activeItem2Limits: ILimits;
    passiveLimits: ILimits
    bonusMoves: number;
    bossCrits: number;
    diagonals: boolean;
    goldAddCount: number;
    hasShield: boolean;
    hasUsedShield: boolean;
    moveSaverChance: number;
    omniMoves: number;
    reach: number;
    criticalChance: number;
    rerolls: number;
    bossMoves: number;
    colorDamageBosts: { [key: string]: IShape };
}

export interface IDamageData {
    damage: number;
    shielded: boolean;
}