export interface IItem {
    rarity: string;
    name: string;
    description: string;
    effect: () => void;
    price: number;

    frequency: Frequency;
    unique: boolean;
    disabled: boolean;
}

export enum Frequency {
    PASSIVE,
    SINGLE_USE,
    EVERY_FLOOR,
    EVERY_STAGE,
    EVERY_ENEMY
}

export interface IUnlocks {
    name: string;
    date: Date;
}