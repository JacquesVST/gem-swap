export interface IItem {
    rarity: string;
    name: string;
    description: string;
    price: number;
    
    frequency: Frequency;
    unique: boolean;
    disabled: boolean;
    
    effect: () => void;
}

export interface IRelic {
    name: string;
    power: number;
    stat1: IStat;
    stat2: IStat;
    stat3: IStat;
}

export interface IStat {
    name: string;
    bonus: number;
    rawBonus: number;
    label?: string;
    isPercent?: boolean;
}

export interface IStatRange {
    name: string;
    min: number;
    max: number;
}

export enum Frequency {
    PASSIVE,
    SINGLE_USE,
    EVERY_FLOOR,
    EVERY_STAGE,
    EVERY_ENEMY
}

export interface IUnlocks {
    item: string;
    date: Date;
    tier: number;
}