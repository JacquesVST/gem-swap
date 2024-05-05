import { Item } from "./Item";

export class Effect {
    id: string
    effect: (item: Item) => void;
    chance: number;

    constructor(id: string, effect: (item: Item) => void, chance: number) {
        this.id = id;
        this.effect = effect;
        this.chance = chance;
    }
}