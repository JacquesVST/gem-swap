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