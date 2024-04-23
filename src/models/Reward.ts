import { Run } from "./Run";

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

export class RewardPools {
    static defaultPool(run: Run): Reward[] {
        return [
            new Reward(
                'Common',
                'your average item #1',
                '+1 move(s)',
                (() => {
                    run.movesPerStage += 1;
                }).bind(run)
            ),
            new Reward(
                'Rare',
                'your average item #3',
                '+2 move(s)',
                (() => {
                    run.movesPerStage += 2
                }).bind(run)
            ),
            new Reward(
                'Epic',
                'novo item epico #4',
                'x2 DMG!',
                (() => {
                    run.damageMultiplier = run.damageMultiplier * 2;
                }).bind(run)
            ),
            new Reward(
                'Common',
                'Vida modesta',
                '+ 5 HP Max',
                (() => {
                    run.character.health += 5
                    run.character.currentHealth += 5
                }).bind(run)
            ),
            new Reward(
                'Common',
                'Cura modesta',
                '+ 10 HP',
                (() => {
                    run.character.currentHealth += 10
                }).bind(run)
            ),
            new Reward(
                'Rare',
                'Escudão',
                'Bloqueia primeiro hit letal',
                (() => {
                    run.character.hasItemThatPreventsFirstLethalDamage = true
                    run.character.hasUsedItemThatPreventsFirstLethalDamage = false
                }).bind(run)
            )
        ]
    }
}