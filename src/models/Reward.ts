import { Character } from "./Character";
import { Run } from "./Run";
import { Shape } from "./Shape";

export class Reward {
    rarity: string;
    name: string;
    description: string;
    weight: number;
    effect: () => void;

    constructor(weight: number, rarity: string, name: string, description: string, effect: () => void) {
        this.weight = weight
        this.rarity = rarity
        this.name = name
        this.description = description
        this.effect = effect
    }

}

export class RewardPools {
    static defaultPool(run: Run): Reward[] {
        return [
            new Reward(
                1,
                'Common',
                'Extra Move',
                '+1 move',
                (() => {
                    run.movesPerStage += 1;
                }).bind(run)
            ),
            new Reward(
                1,
                'Common',
                'Max Health Gain',
                '+5 HP Max',
                (() => {
                    run.character.health += 5
                    run.character.heal(5)
                }).bind(run)
            ),
            new Reward(
                1,
                'Common',
                'Instant Health',
                '+10% HP',
                (() => {
                    run.character.heal(run.character.health/10)
                }).bind(run)
            ),
            new Reward(
                1,
                'Common',
                'Damage Boost',
                '+25 base DMG',
                (() => {
                    run.character.attack += 25
                }).bind(run)
            ),
            new Reward(
                1,
                'Common',
                'Red Boost',
                '+50 base DMG on red matches',
                (() => {
                    giveColorBonusDmg(run, 'red');
                }).bind(run)
            ),
            new Reward(
                1,
                'Common',
                'Green Boost',
                '+50 base DMG on green matches',
                (() => {
                    giveColorBonusDmg(run, 'green');
                }).bind(run)
            ),
            new Reward(
                1,
                'Common',
                'Blue Boost',
                '+50 base DMG on blue matches',
                (() => {
                    giveColorBonusDmg(run, 'blue');
                }).bind(run)
            ),
            new Reward(
                1,
                'Common',
                'Yellow Boost',
                '+50 base DMG on yellow matches',
                (() => {
                    giveColorBonusDmg(run, 'yellow');
                }).bind(run)
            ),
            new Reward(
                1,
                'Common',
                'Orange Boost',
                '+50 base DMG on orange matches',
                (() => {
                    giveColorBonusDmg(run, 'orange');
                }).bind(run)
            ),
            new Reward(
                1,
                'Common',
                'Pink Boost',
                '+50 base DMG on pink matches',
                (() => {
                    giveColorBonusDmg(run, 'pink');
                }).bind(run)
            ),
            (() => {
                let randomColor: number = Math.floor(Math.random() * Object.entries(run.possibleShapes).length);
                let chosenColor: [string, any] = Object.entries(run.possibleShapes)[randomColor]
                return new Reward(
                    1,
                    'Rare',
                    `Eliminate all ${chosenColor[0]} items`,
                    `Remove current ${chosenColor[0]} items from the board`,
                    (() => {
                        run.initialShuffle = false;
                        run.stackCombo = true;
                        run.grid.cells.flat().forEach((cell) => {
                            if (cell?.item?.shape?.sides === randomColor + 3) {
                                cell.item = undefined
                            }
                        });
                    }).bind(run)
                )
            })(),
            new Reward(
                1,
                'Rare',
                '4+ Match Regeneration',
                'Gain 1% HP every 4+ items in a single match',
                (() => {
                    run.character.hpRegenFromReward += 1;
                }).bind(run)
            ),
            new Reward(
                1,
                'Rare',
                'Move Saver',
                '10% chance of not consuming moves',
                (() => {
                    run.moveSaver += 0.10
                }).bind(run)
            ),
            new Reward(1,
                'Rare',
                'Shield',
                'Block one letal hit',
                (() => {
                    run.character.hasItemThatPreventsFirstLethalDamage = true
                    run.character.hasUsedItemThatPreventsFirstLethalDamage = false
                }).bind(run)
            ),
            new Reward(
                1,
                'Epic',
                'Big Damage Boost',
                'x1.5 DMG',
                (() => {
                    run.character.damageMultiplier *= 1.5;
                }).bind(run)
            ),
            (() => {
                if (Object.entries(run.possibleShapes).length >= 4) {
                    let randomColor: number = Math.floor(Math.random() * Object.entries(run.possibleShapes).length);
                    let chosenColor: [string, any] = Object.entries(run.possibleShapes)[randomColor]
                    return new Reward(
                        1,
                        'Epic',
                        `Ban ${chosenColor[0]} items`,
                        `No more ${chosenColor[0]} items for the rest of the run`,
                        (() => {
                            delete run.possibleShapes[chosenColor[0]]
                            run.initialShuffle = false;
                            run.stackCombo = true;
                            run.grid.cells.flat().forEach((cell) => {
                                if (cell?.item?.shape?.sides === randomColor + 3) {
                                    cell.item = undefined
                                }
                            });
                        }).bind(run)
                    )
                } 
                return new Reward(
                    1,
                    'Epic',
                    'Consolation Prize',
                    'You probably broke the game',
                    (() => {
                        console.log(':)');
                    }).bind(run)
                )
            })(),
        ]
    }
}

function giveColorBonusDmg(run: Run, color: string) {
    let bonus: number = 50;
    let shape: Shape = run.possibleShapes[color];
    shape.bonusDmg = bonus;
    run.grid.cells.flat().forEach((cell) => {
        if (cell?.item?.shape?.color?.checksum === shape.color.checksum) {
            cell.item.shape.bonusDmg += bonus;
        }
    });
}
