import { Run } from "./Run";
import { Shape } from "./Shape";

export class Reward {
    rarity: string;
    name: string;
    description: string;
    effect: () => void;

    constructor(rarity: string, name: string, description: string, effect: () => void) {
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
                'Extra movess',
                '+2 move(s)',
                (() => {
                    run.movesPerStage += 2;
                }).bind(run)
            ),
            new Reward(
                'Common',
                'Max Hp Gain',
                '+5 HP Max',
                (() => {
                    run.character.health += 5
                    run.character.currentHealth += 5
                }).bind(run)
            ),
            new Reward(
                'Common',
                'HP Recovery',
                '+10 HP',
                (() => {
                    run.character.currentHealth += 10
                }).bind(run)
            ),
            new Reward(
                'Common',
                'Damage Boost',
                '+25 base DMG',
                (() => {
                    run.damageBoost += 25
                }).bind(run)
            ),
            new Reward(
                'Common',
                'Red Boost',
                '+20 base DMG on red matches',
                (() => {
                    giveColorBonusDmg(run, 'red');
                }).bind(run)
            ),
            new Reward(
                'Common',
                'Green Boost',
                '+20 base DMG on green matches',
                (() => {
                    giveColorBonusDmg(run, 'green');
                }).bind(run)
            ),
            new Reward(
                'Common',
                'Blue Boost',
                '+20 base DMG on blue matches',
                (() => {
                    giveColorBonusDmg(run, 'blue');
                }).bind(run)
            ),
            new Reward(
                'Common',
                'Yellow Boost',
                '+20 base DMG on yellow matches',
                (() => {
                    giveColorBonusDmg(run, 'yellow');
                }).bind(run)
            ),
            new Reward(
                'Common',
                'Orange Boost',
                '+20 base DMG on orange matches',
                (() => {
                    giveColorBonusDmg(run, 'orange');
                }).bind(run)
            ),
            new Reward(
                'Common',
                'Pink Boost',
                '+20 base DMG on pink matches',
                (() => {
                    giveColorBonusDmg(run, 'pink');
                }).bind(run)
            ),
            new Reward(
                'Rare',
                'Ban Random Color',
                'Remove a random color from the board',
                (() => {
                    let randomShape: number = Math.floor(Math.random() * Object.entries(run.possibleShapes).length);
                    run.initialShuffle = false;
                    run.stackCombo = true;
                    run.grid.cells.flat().forEach((cell) => {
                        if (cell.item.shape.sides === randomShape + 3) {
                            cell.item = undefined
                        }
                    });
                }).bind(run)
            ),
            new Reward(
                'Rare',
                'Move Saver',
                '10% chance of not consuming moves',
                (() => {
                    run.moveSaver = 0.10
                }).bind(run)
            ),
            new Reward(
                'Rare',
                'Shield',
                'Block one letal hit',
                (() => {
                    run.character.hasItemThatPreventsFirstLethalDamage = true
                    run.character.hasUsedItemThatPreventsFirstLethalDamage = false
                }).bind(run)
            ),
            new Reward(
                'Epic',
                'Big Damage Boost',
                'x1.5 DMG!',
                (() => {
                    run.damageMultiplier = run.damageMultiplier * 1.5;
                }).bind(run)
            ),
        ]
    }
}

function giveColorBonusDmg(run: Run, color: string) {
    let bonus: number = 50;
    let shape: Shape = run.possibleShapes[color];
    shape.bonusDmg = bonus;
    run.grid.cells.flat().forEach((cell) => {
        if (cell.item.shape.color.checksum === shape.color.checksum) {
            cell.item.shape.bonusDmg = bonus;
        }
    });
}
