import { Color } from "./Color";
import { Run } from "./Run";
import { Shape } from "./Shape";

export class Reward {
    rarity: string;
    name: string;
    description: string;
    weight: number;
    price: number;
    effect: () => void;

    constructor(weight: number, rarity: string, name: string, description: string, effect: () => void, price?: number) {
        this.weight = weight
        this.rarity = rarity
        this.name = name
        this.description = description
        this.price = price;
        this.effect = effect
    }

    static rarityColors(): { [key: string]: Color } {
        return {
            'Common': new Color(224, 224, 224),
            'Rare': new Color(101, 206, 80),
            'Epic': new Color(84, 80, 206)
        }
    }
}

export class RewardPools {
    static shopPool(run: Run): Reward[] {
        return [
            (() => {
                let price: number = 20;
                return new Reward(
                    1,
                    'Common',
                    'Max Instant health',
                    'Full heal',
                    (() => {
                        run.character.gold -= price;
                        run.character.heal(run.character.health);
                    }).bind(run),
                    price,
                );
            })(),
            (() => {
                let price: number = 50;
                return new Reward(
                    1,
                    'Common',
                    'Extra Moves',
                    '+3 moves',
                    (() => {
                        run.character.gold -= price;
                        run.movesPerStage += 3;
                    }).bind(run),
                    price,
                );
            })(),
            (() => {
                let price: number = 100;
                return new Reward(
                    1,
                    'Rare',
                    'Horizontal Expansion',
                    '+1 column',
                    (() => {
                        run.character.gold -= price;
                        run.grid.width++;
                        run.grid.generateEmptyCells();
                        run.grid.calculateSpacing(run.canvas);
                    }).bind(run),
                    price,
                );
            })(),
            (() => {
                let price: number = 100;
                return new Reward(
                    1,
                    'Rare',
                    'Vertical Expansion',
                    '+1 row',
                    (() => {
                        run.character.gold -= price;
                        run.grid.height++;
                        run.grid.generateEmptyCells();
                        run.grid.calculateSpacing(run.canvas);
                    }).bind(run),
                    price,
                );
            })(),
            (() => {
                let price: number = 150;
                return new Reward(
                    1,
                    'Epic',
                    'More options',
                    '+1 boss reward option',
                    (() => {
                        run.character.gold -= price;
                        run.rewardOptions++;
                    }).bind(run),
                    price,
                );
            })()
        ]
    }

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
                    run.character.heal(run.character.health / 10)
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
                let randomShape: number = Math.floor(Math.random() * run.possibleShapes.length);
                let chosenShape: Shape = run.possibleShapes[randomShape];
                return new Reward(
                    1,
                    'Rare',
                    `Eliminate all ${chosenShape.id} items`,
                    `Remove current ${chosenShape.id} items from the board`,
                    (() => {
                        run.initialShuffle = false;
                        run.stackCombo = true;
                        run.grid.cells.flat().forEach((cell) => {
                            if (cell?.item?.shape?.id === chosenShape.id) {
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
                    run.character.moveSaver += 0.10
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
                if (run.possibleShapes.length >= 4) {
                    let randomShape: number = Math.floor(Math.random() * run.possibleShapes.length);
                    let chosenShape: Shape = run.possibleShapes[randomShape];
                    return new Reward(
                        1,
                        'Epic',
                        `Ban ${chosenShape.id} items`,
                        `No more ${chosenShape.id} items for the rest of the run`,
                        (() => {
                            run.possibleShapes.splice(randomShape, 1)
                            run.initialShuffle = false;
                            run.stackCombo = true;
                            run.grid.cells.flat().forEach((cell) => {
                                if (cell?.item?.shape?.id === chosenShape.id) {
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
    let shape: Shape = run.possibleShapes.find((shape: Shape) => shape.id = color)
    shape.bonusDmg += bonus;
    run.grid.cells.flat().forEach((cell) => {
        if (cell?.item?.shape?.id === shape.id) {
            cell.item.shape.bonusDmg += bonus;
        }
    });
}
