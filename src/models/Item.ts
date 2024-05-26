import { Color } from "./Color";
import { Effect, EffectParams } from "./Effect";
import { Player } from "./Player";
import { Run } from "./Run";
import { Shape } from "./Shape";

export class Item {
    rarity: string;
    name: string;
    description: string;
    effect: () => void;
    price: number;
    isActive: boolean;

    unique: boolean;

    constructor(rarity: string, name: string, description: string, effect: () => void, price?: number, isActive?: boolean, unique?: boolean) {
        this.rarity = rarity;
        this.name = name;
        this.description = description;
        this.effect = effect;
        this.price = price;
        this.isActive = isActive;
        this.unique = unique;
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
            }
        };
    }

    static generateItemsBasedOnRarity(amount: number, pool: Item[], rarities: string[], player: Player): Item[] {
        let itemsOfRarity: Item[][] = [];
        let counts = {};

        for (let i: number = 0; i < amount; i++) {
            let chance = Math.random();

            let chosenPool: Item[];
            let chosenRarity: string;

            for (let index = 0; index < rarities.length; index++) {
                if (chance < Item.rarityColors()[rarities[index]].chance || index === rarities.length - 1) {
                    chosenRarity = rarities[index];
                    chosenPool = pool.filter((item: Item) => item.rarity === rarities[index]);
                    break;
                }
            }

            counts[chosenRarity] = counts[chosenRarity] ? counts[chosenRarity] + 1 : 1;
            itemsOfRarity.push(chosenPool);
        }

        let itemList: Item[] = [];
        itemsOfRarity.forEach((items: Item[]) => {
            items = items.filter((item: Item) => !(player.hasItem(item.name) && item.unique));
            let initialLength: number = itemList.length;
            do {
                let random: number = Math.floor(Math.random() * items.length);

                if (!itemList.map((item: Item) => item.name).includes(items[random].name)) {
                    itemList.push(items[random]);
                } else {
                    let rarityCheck = items[0].rarity;
                    if (counts[rarityCheck] > items.length) {
                        itemList.push(items[random]);
                    }
                }
            } while (itemList.length === initialLength);
        });

        return itemList;
    }
}

export class ItemPools {
    static fullHealthShopItem(run: Run): Item {
        let price: number = 20;
        let name: string = 'Max Instant health';
        price = price * run.costMultiplier;
        price = run.player.items.findIndex((item: Item) => item.name === name) !== -1 ? Math.floor(price * 1.2) : price;
        return new Item(
            'Common',
            name,
            'Full heal',
            (() => {
                run.player.gold -= price;
                run.player.heal(run.player.health);
            }).bind(run),
            price,
        );
    }

    static shopPool(run: Run): Item[] {
        let shopPool: Item[] = [
            (() => {
                let price: number = 30;
                let name: string = 'Where it matters';
                price = price * run.costMultiplier;
                price = run.player.items.findIndex((item: Item) => item.name === name) !== -1 ? Math.floor(price * 1.2) : price;
                return new Item(
                    'Common',
                    name,
                    '+1 Critical piece on a boss fight',
                    (() => {
                        run.player.gold -= price;
                        run.player.bossCritical += 1;
                    }).bind(run),
                    price,
                );
            })(),
            (() => {
                let price: number = 30;
                let name: string = 'Extra Moves';
                price = price * run.costMultiplier;
                price = run.player.items.findIndex((item: Item) => item.name === name) !== -1 ? Math.floor(price * 1.2) : price;
                return new Item(
                    'Common',
                    name,
                    '+3 moves',
                    (() => {
                        run.player.gold -= price;
                        run.maxMoves += 3;
                    }).bind(run),
                    price,
                );
            })(),
            (() => {
                let price: number = 75;
                let name: string = 'Horizontal Expansion';
                price = price * run.costMultiplier;
                price = run.player.items.findIndex((item: Item) => item.name === name) !== -1 ? Math.floor(price * 1.2) : price;
                return new Item(
                    'Rare',
                    name,
                    '+1 column',
                    (() => {
                        run.player.gold -= price;
                        run.map.gridX++;
                    }).bind(run),
                    price,
                );
            })(),
            (() => {
                let price: number = 75;
                let name: string = 'Vertical Expansion';
                price = price * run.costMultiplier;
                price = run.player.items.findIndex((item: Item) => item.name === name) !== -1 ? Math.floor(price * 1.2) : price;
                return new Item(
                    'Rare',
                    name,
                    '+1 row',
                    (() => {
                        run.player.gold -= price;
                        run.map.gridY++;
                    }).bind(run),
                    price,
                );
            })(),
            (() => {
                let price: number = 100;
                let name: string = 'More Options';
                price = price * run.costMultiplier;
                price = run.player.items.findIndex((item: Item) => item.name === name) !== -1 ? Math.floor(price * 1.2) : price;
                return new Item(
                    'Epic',
                    name,
                    '+1 boss item option',
                    (() => {
                        run.player.gold -= price;
                        run.itemOptions++;
                    }).bind(run),
                    price,
                );
            })()
        ]

        if (run.possibleShapes.length >= 4) {
            let price: number = 150;
            price = price * run.costMultiplier;
            price = run.player.items.findIndex((item: Item) => item.name.startsWith('Ban')) !== -1 ? Math.floor(price * 1.2) : price;

            run.possibleShapes.forEach((shape: Shape) => {
                shopPool.push(new Item(
                    'Epic',
                    `Ban ${shape.id} pieces`,
                    `No more ${shape.id} pieces forever`,
                    (() => {
                        run.emit('Item:BanShape', shape.id);
                    }).bind(run),
                    price
                ));
            });
        }

        return shopPool;
    }

    static defaultPool(run: Run): Item[] {
        let defaultPool: Item[] = [
            (() => {
                let name: string = 'Vertical AOE';
                return new Item(
                    'Common',
                    name,
                    '+3% chance of column clearing pieces',
                    (() => {
                        let effectIndex: number = run.possibleEffects.findIndex((effect: Effect) => effect.id === name);

                        if (effectIndex === -1) {
                            run.possibleEffects.push(new Effect(name, (params: EffectParams) => {
                                run.emit('Item:ClearColumn', params);
                            }, 0.03));
                        } else {
                            run.possibleEffects[effectIndex].chance += 0.03;
                        }
                    }).bind(run)
                );
            })(),
            (() => {
                let name: string = 'Horizontal AOE';
                return new Item(
                    'Common',
                    name,
                    '+3% chance of row clearing pieces',
                    (() => {
                        let effectIndex: number = run.possibleEffects.findIndex((effect: Effect) => effect.id === name);

                        if (effectIndex === -1) {
                            run.possibleEffects.push(new Effect(name, (params: EffectParams) => {
                                run.emit('Item:ClearRow', params);
                            }, 0.03))
                        } else {
                            run.possibleEffects[effectIndex].chance += 0.03;
                        }
                    }).bind(run)
                );
            })(),
            new Item(
                'Common',
                'Extra Move',
                '+1 move',
                (() => {
                    run.maxMoves += 1;
                    run.player.moves += 1;
                }).bind(run)
            ),
            new Item(
                'Common',
                'Extra Critical',
                '+1 critical on grid',
                (() => {
                    run.player.critical += 1;
                }).bind(run)
            ),
            new Item(
                'Common',
                'Critical Multiplier',
                '+1 critical multiplier',
                (() => {
                    run.player.criticalMultiplier += 1;
                }).bind(run)
            ),
            new Item(
                'Common',
                'Max Health Gain',
                '+5 HP Max',
                (() => {
                    run.player.health += 5;
                    run.player.heal(5);
                }).bind(run)
            ),
            new Item(
                'Common',
                'Defense Gain',
                '+5 Defense',
                (() => {
                    run.player.defense += 5;
                }).bind(run)

            ),
            new Item(
                'Common',
                'Instant Health',
                '+10% HP',
                (() => {
                    run.player.heal(run.player.health / 10);
                }).bind(run)
            ),
            new Item(
                'Common',
                'Damage Boost',
                '+25 base DMG',
                (() => {
                    run.player.attack += 25;
                }).bind(run)
            ),
            new Item(
                'Common',
                'Red Boost',
                '+50 base DMG on red matches',
                (() => {
                    run.emit('Item:ColorDamageBoost', 'red', 50);
                }).bind(run)
            ),
            new Item(
                'Common',
                'Green Boost',
                '+50 base DMG on green matches',
                (() => {
                    run.emit('Item:ColorDamageBoost', 'green', 50);
                }).bind(run)
            ),
            new Item(
                'Common',
                'Blue Boost',
                '+50 base DMG on blue matches',
                (() => {
                    run.emit('Item:ColorDamageBoost', 'blue', 50);
                }).bind(run)
            ),
            new Item(
                'Common',
                'Yellow Boost',
                '+50 base DMG on yellow matches',
                (() => {
                    run.emit('Item:ColorDamageBoost', 'yellow', 50);
                }).bind(run)
            ),
            new Item(
                'Common',
                'Orange Boost',
                '+50 base DMG on orange matches',
                (() => {
                    run.emit('Item:ColorDamageBoost', 'orange', 50);
                }).bind(run)
            ),
            new Item(
                'Common',
                'Pink Boost',
                '+50 base DMG on pink matches',
                (() => {
                    run.emit('Item:ColorDamageBoost', 'pink', 50);
                }).bind(run)
            ),
            new Item(
                'Rare',
                '4+ Match Regeneration',
                'Gain 1% HP every 4+ piece match',
                (() => {
                    run.player.hpRegenFromItem += 1;
                }).bind(run)
            ),
            new Item(
                'Rare',
                'Move Saver',
                '10% chance of not consuming moves',
                (() => {
                    run.player.moveSaver += 0.10;
                }).bind(run)
            ),
            new Item(
                'Rare',
                'Shield',
                'Block one letal hit',
                (() => {
                    run.player.hasItemThatPreventsFirstLethalDamage = true;
                    run.player.hasUsedItemThatPreventsFirstLethalDamage = false;
                }).bind(run)
            ),
            new Item(
                'Rare',
                'Big Max Health Gain',
                '+20 HP Max',
                (() => {
                    run.player.health += 20;
                    run.player.heal(20);
                }).bind(run)
            ),
            new Item(
                'Epic',
                'Big Critical Boost',
                '+2 criticals on grid and multiplier',
                (() => {
                    run.player.criticalMultiplier += 2;
                    run.player.critical += 2
                }).bind(run)
            ),
            new Item(
                'Epic',
                'Big Damage Boost',
                'x1.5 DMG',
                (() => {
                    run.player.damageMultiplier *= 1.5;
                }).bind(run)
            ),
            new Item(
                'Epic',
                '20% Sale',
                'Shop prices discounted',
                (() => {
                    run.costMultiplier *= 0.8;
                }).bind(run)
            ),
        ];

        run.possibleShapes.forEach((shape: Shape) => {
            defaultPool.push(new Item(
                'Rare',
                `Eliminate all ${shape.id} pieces`,
                `Remove current ${shape.id} pieces`,
                (() => {
                    run.stackCombo = true;
                    run.emit('Item:EliminateShape', shape.id);
                }).bind(run),
                undefined,
                true
            ));
        })

        let uniqueItems = [
            new Item(
                'Epic',
                'Combos multiply DMG',
                'Final DMG multiplies combo counter',
                (() => { }).bind(run),
                undefined,
                undefined,
                true
            ),
            new Item(
                'Rare',
                'Valuable combo',
                'Get 1 gold every combo over 1',
                (() => { }).bind(run),
                undefined,
                undefined,
                true
            ),
            new Item(
                'Rare',
                'Hit Streak',
                'Bonus DMG for Consecutive matches',
                (() => { run.consecutiveCombo = 0; }).bind(run),
                undefined,
                undefined,
                true
            ),
        ];

        return defaultPool.concat(uniqueItems.filter((item: Item) => !run.player.hasItem(item.name)));
    }
}
