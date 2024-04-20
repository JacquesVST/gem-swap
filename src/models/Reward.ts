export class Reward {
    rarity: string;
    name: string;
    description: string;
    effect: () => void;

    constructor(rarity: string,name: string, description: string,  effect: () => void) {
        this.rarity = rarity
        this.effect = effect
        this.name = name
        this.description = description
    }

}