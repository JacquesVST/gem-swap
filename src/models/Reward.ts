import { Cell } from "./Cell";
import { Color } from "./Color";
import { Effect } from "./Effect";
import { Item } from "./Item";
import { Run } from "./Run";
import { Shape } from "./Shape";

export class Reward {
    rarity: string;
    name: string;
    description: string;
    effect: () => void;
    price: number;
    isActive: boolean;

    unique: boolean;

    constructor(rarity: string, name: string, description: string, effect: () => void, price?: number, isActive?: boolean, unique?: boolean) {
        this.rarity = rarity
        this.name = name
        this.description = description
        this.effect = effect
        this.price = price;
        this.isActive = isActive;
        this.unique = unique
    }

    static rarityColors(): { [key: string]: { color: Color, chance: number } } {
        return {
            'Common': {
                color: new Color(224, 224, 224),
                chance: 0.75
            },
            'Rare': {
                color: new Color(101, 206, 80),
                chance: 0.95
            },
            'Epic': {
                color: new Color(84, 80, 206),
                chance: 1
            },
            'Unique': {
                color: new Color(243, 156, 18),
                chance: 0
            }
        }
    }
}

export class RewardPools {
    static shopPool(run: Run): Reward[] {
        let shopPool: Reward[] = [
            (() => {
                let price: number = 20;
                let name: string = 'Max Instant health';
                price = price * run.costMultiplier;
                price = run.character.rewards.findIndex((reward: Reward) => reward.name === name) !== -1 ?
                    Math.floor(price * 1.2) : price;
                return new Reward(
                    'Common',
                    name,
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
                let name: string = 'Extra Moves';
                price = price * run.costMultiplier;
                price = run.character.rewards.findIndex((reward: Reward) => reward.name === name) !== -1 ?
                    Math.floor(price * 1.2) : price;
                return new Reward(
                    'Common',
                    name,
                    '+3 moves',
                    (() => {
                        run.character.gold -= price;
                        run.maxMoves += 3;
                    }).bind(run),
                    price,
                );
            })(),
            (() => {
                let price: number = 100;
                let name: string = 'Horizontal Expansion';
                price = price * run.costMultiplier;
                price = run.character.rewards.findIndex((reward: Reward) => reward.name === name) !== -1 ?
                    Math.floor(price * 1.2) : price;
                return new Reward(
                    'Rare',
                    name,
                    '+1 column',
                    (() => {
                        run.character.gold -= price;
                        run.grid.width++;
                        run.grid.renew(run)
                    }).bind(run),
                    price,
                );
            })(),
            (() => {
                let price: number = 100;
                let name: string = 'Vertical Expansion';
                price = price * run.costMultiplier;
                price = run.character.rewards.findIndex((reward: Reward) => reward.name === name) !== -1 ?
                    Math.floor(price * 1.2) : price;
                return new Reward(
                    'Rare',
                    name,
                    '+1 row',
                    (() => {
                        run.character.gold -= price;
                        run.grid.height++;
                        run.grid.renew(run)
                    }).bind(run),
                    price,
                );
            })(),
            (() => {
                let price: number = 200;
                let name: string = 'More Options';
                price = price * run.costMultiplier;
                price = run.character.rewards.findIndex((reward: Reward) => reward.name === name) !== -1 ?
                    Math.floor(price * 1.2) : price;
                return new Reward(
                    'Epic',
                    name,
                    '+1 boss reward option',
                    (() => {
                        run.character.gold -= price;
                        run.rewardOptions++;
                    }).bind(run),
                    price,
                );
            })()
        ]

        if (run.possibleShapes.length >= 4) {
            let price: number = 200;
            price = price * run.costMultiplier;
            price = run.character.rewards.findIndex((reward: Reward) => reward.name.startsWith('Ban')) !== -1 ?
                Math.floor(price * 1.2) : price;

            run.possibleShapes.forEach((shape: Shape) => {
                shopPool.push(new Reward(
                    'Epic',
                    `Ban ${shape.id} items`,
                    `No more ${shape.id} items for the rest of the run`,
                    (() => {
                        run.possibleShapes = run.possibleShapes.filter((runShape: Shape) => runShape.id === shape.id);
                        run.stackCombo = true;
                        gridMassItemRemoval(run, (cell: Cell) => cell?.item?.shape?.id === shape.id);

                        run.grid.generateItemsApplyGravityLoop(false, run)
                    }).bind(run),
                    price
                ));
            });
        }

        return shopPool;
    }

    static defaultPool(run: Run): Reward[] {
        let defaultPool: Reward[] = [
            (() => {
                let name: string = 'Vertical AOE';
                return new Reward(
                    'Common',
                    name,
                    '+2% chance of column clearing items',
                    (() => {
                        let effectIndex: number = run.possibleEffects.findIndex((effect: Effect) => effect.id === name);

                        if (effectIndex === -1) {
                            run.possibleEffects.push(new Effect(name, (item: Item) => {
                                gridMassItemRemoval(run, (cell: Cell) => cell.position.x === item.position.x && cell.position.checksum !== item.position.checksum);
                            }, 0.02))
                        } else {
                            run.possibleEffects[effectIndex].chance += 0.02
                        }
                    }).bind(run)
                )
            })(),
            (() => {
                let name: string = 'Horizontal AOE';
                return new Reward(
                    'Common',
                    name,
                    '+2% chance of row clearing items',
                    (() => {
                        let effectIndex: number = run.possibleEffects.findIndex((effect: Effect) => effect.id === name);

                        if (effectIndex === -1) {
                            run.possibleEffects.push(new Effect(name, (item: Item) => {
                                gridMassItemRemoval(run, (cell: Cell) => cell.position.y === item.position.y && cell.position.checksum !== item.position.checksum);
                            }, 0.02))
                        } else {
                            run.possibleEffects[effectIndex].chance += 0.02
                        }
                    }).bind(run)
                )
            })(),
            new Reward(
                'Common',
                'Extra Move',
                '+1 move',
                (() => {
                    run.maxMoves += 1;
                    run.character.moves += 1;
                }).bind(run)
            ),
            new Reward(
                'Common',
                'Extra Critical',
                '+1 critical on grid',
                (() => {
                    run.grid.critical += 1;
                }).bind(run)
            ),
            new Reward(
                'Common',
                'Critical Multiplier',
                '+1 critical multiplier',
                (() => {
                    run.character.criticalMultiplier += 1;
                }).bind(run)
            ),
            new Reward(
                'Common',
                'Max Health Gain',
                '+5 HP Max',
                (() => {
                    run.character.health += 5
                    run.character.heal(5)
                }).bind(run)
            ),
            new Reward(
                'Common',
                'Defense Gain',
                '+5 Defense',
                (() => {
                    run.character.defense += 5
                }).bind(run)
            ),
            new Reward(
                'Common',
                'Instant Health',
                '+10% HP',
                (() => {
                    run.character.heal(run.character.health / 10)
                }).bind(run)
            ),
            new Reward(
                'Common',
                'Damage Boost',
                '+25 base DMG',
                (() => {
                    run.character.attack += 25
                }).bind(run)
            ),
            new Reward(
                'Common',
                'Red Boost',
                '+50 base DMG on red matches',
                (() => {
                    giveColorBonusDmg(run, 'red');
                }).bind(run)
            ),
            new Reward(
                'Common',
                'Green Boost',
                '+50 base DMG on green matches',
                (() => {
                    giveColorBonusDmg(run, 'green');
                }).bind(run)
            ),
            new Reward(
                'Common',
                'Blue Boost',
                '+50 base DMG on blue matches',
                (() => {
                    giveColorBonusDmg(run, 'blue');
                }).bind(run)
            ),
            new Reward(
                'Common',
                'Yellow Boost',
                '+50 base DMG on yellow matches',
                (() => {
                    giveColorBonusDmg(run, 'yellow');
                }).bind(run)
            ),
            new Reward(
                'Common',
                'Orange Boost',
                '+50 base DMG on orange matches',
                (() => {
                    giveColorBonusDmg(run, 'orange');
                }).bind(run)
            ),
            new Reward(
                'Common',
                'Pink Boost',
                '+50 base DMG on pink matches',
                (() => {
                    giveColorBonusDmg(run, 'pink');
                }).bind(run)
            ),
            new Reward(
                'Rare',
                '4+ Match Regeneration',
                'Gain 1% HP every 4+ items in a single match',
                (() => {
                    run.character.hpRegenFromReward += 1;
                }).bind(run)
            ),
            new Reward(
                'Rare',
                'Move Saver',
                '10% chance of not consuming moves',
                (() => {
                    run.character.moveSaver += 0.10
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
                'Rare',
                'Big Max Health Gain',
                '+20 HP Max',
                (() => {
                    run.character.health += 20
                    run.character.heal(20)
                }).bind(run)
            ),
            new Reward(
                'Epic',
                'Critical Boost',
                '+2 criticals on grid and multiplier',
                (() => {
                    run.character.criticalMultiplier += 2;
                    run.grid.critical += 2
                }).bind(run)
            ),
            new Reward(
                'Epic',
                'Big Damage Boost',
                'x1.5 DMG',
                (() => {
                    run.character.damageMultiplier *= 1.5;
                }).bind(run)
            ),
            new Reward(
                'Epic',
                '20% Sale',
                'Shop prices discounted',
                (() => {
                    run.costMultiplier *= 0.8;
                }).bind(run)
            ),
        ];

        run.possibleShapes.forEach((shape: Shape) => {
            defaultPool.push(new Reward(
                'Rare',
                `Eliminate all ${shape.id} items`,
                `Remove current ${shape.id} items from the board`,
                (() => {
                    run.stackCombo = true;
                    gridMassItemRemoval(run, (cell: Cell) => cell?.item?.shape?.id === shape.id, () => {
                        run.character.activeItem = undefined
                    });
                }).bind(run),
                undefined,
                true
            ));
        })


        let uniqueRewards = [
            new Reward(
                'Epic',
                'Combos multiply DMG',
                'Final DMG multiplies combo counter',
                (() => { }).bind(run),
                undefined,
                undefined,
                true
            ),
            new Reward(
                'Rare',
                'Valuable combo',
                'Get 1 gold every combo over 1',
                (() => { }).bind(run),
                undefined,
                undefined,
                true
            ),
        ];

        return defaultPool.concat(uniqueRewards.filter((reward: Reward) => !run.character.hasReward(reward.name)))
    }
}

function gridMassItemRemoval(run: Run, filter: (cell: Cell) => boolean, callback?: () => void): void {
    if (callback) {
        callback();
    }

    let itemsToRemove: Item[] = run.grid.cells.flat().filter(filter).map((cell: Cell) => cell.item).filter((item: Item) => item);

    run.grid.bootstrapStabilize([itemsToRemove], run, (matches: Item[][]) => {
        run.processMacthList(matches)
    });

}

function giveColorBonusDmg(run: Run, color: string): void {
    let bonus: number = 50;
    let shapeIndex: number = run.possibleShapes.findIndex((shape: Shape) => shape.id = color);
    if (shapeIndex !== -1) {
        run.possibleShapes[shapeIndex].bonusDmg += bonus;

        run.grid.cells.flat().forEach((cell) => {
            if (cell?.item?.shape?.id === color) {
                cell.item.shape.bonusDmg = run.possibleShapes[shapeIndex].bonusDmg;
            }
        });
    }
}
