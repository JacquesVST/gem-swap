import { Frequency, IItem } from "../interfaces";
import { Color } from "./Color";
import { Effect, EffectParams } from "./Effect";
import { Player } from "./Player";
import { Run } from "./Run";
import { Shape } from "./Shape";

export class Item implements IItem {
    rarity: string;
    name: string;
    description: string;
    effect: () => void;
    price: number;

    frequency: Frequency;
    unique: boolean;
    disabled: boolean;

    constructor(rarity: string, name: string, description: string, effect: () => void, frequency: Frequency = Frequency.PASSIVE, price?: number, unique?: boolean) {
        this.rarity = rarity;
        this.name = name;
        this.description = description;
        this.effect = effect;
        this.price = price;
        this.frequency = frequency;
        this.unique = unique;

        this.disabled = false;
    }

    static get rarityColors(): { [key: string]: { color: Color, chance: number, chanceShop: number } } {
        return {
            'Common': {
                color: Color.WHITE_1,
                chance: 0.75,
                chanceShop: 0
            },
            'Rare': {
                color: Color.GREEN,
                chance: 0.95,
                chanceShop: 0.80
            },
            'Epic': {
                color: Color.PURPLE,
                chance: 1,
                chanceShop: 1
            },
            'Passive': {
                color: Color.ORANGE,
                chance: 0,
                chanceShop: 0
            }
        };
    }


    static generateItemsBasedOnRarity(amount: number, pool: Item[], rarities: string[], player: Player, shop: boolean = false): Item[] {
        let itemsOfRarity: Item[][] = [];
        let counts = {};

        for (let i: number = 0; i < amount; i++) {
            let chance = Math.random();

            let chosenPool: Item[];
            let chosenRarity: string;

            for (let index = 0; index < rarities.length; index++) {
                if (chance < (shop ? Item.rarityColors[rarities[index]].chanceShop : Item.rarityColors[rarities[index]].chance) || index === rarities.length - 1) {
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

    static passivePool(): Item[] {
        let passivePool: Item[] = [
            new Item(
                'Passive',
                '4x4',
                'Can only match 4 pieces or more, but damage is quadrupled',
                () => { }
            ),
            new Item(
                'Passive',
                'Flexible',
                'Can move diagonals, but they deal -10% damage',
                () => { }
            ),
            new Item(
                'Passive',
                'Gambler',
                'Can reroll once every floor, unused rerolls will stack',
                () => { }
            ),
            new Item(
                'Passive',
                'Less Is More',
                'Start with one less color, grid is 1x1 shorter',
                () => { }
            ),
            new Item(
                'Passive',
                'Midas Touched',
                '+1 Gold for matches with pieces on the extremities, +2 on crit',
                () => { }
            ),
            new Item(
                'Passive',
                'Natural Crit',
                'Inate 5% critical chance on every match, +50% critical multiplier',
                () => { }
            ),
            new Item(
                'Passive',
                'No barriers',
                'Grid is 1x1 larger, you also have +1 reach',
                () => { }
            ),
            new Item(
                'Passive',
                'Tank',
                'Start with +10 defense and -2 moves',
                () => { }
            ),
            new Item(
                'Passive',
                'Think Fast',
                'Has a timer that resets every move that multiplies your damage the faster you act',
                () => { }
            )
        ]
        return passivePool;
    }

    static fullHealthShopItem(run: Run): Item {
        let price: number = 20;
        let name: string = 'Max Instant health';
        price = price * run.costMultiplier;
        price = run.player.items.findIndex((item: Item) => item.name === name) !== -1 ? Math.floor(price * 1.25) : price;
        return new Item(
            'Common',
            name,
            'Full heal',
            (() => {
                run.player.heal(run.player.maxHealth);
            }).bind(run),
            Frequency.PASSIVE,
            price,
        );
    }

    static shopPool(run: Run): Item[] {
        let shopPool: Item[] = [
            (() => {
                let price: number = 100;
                let name: string = 'tirC';
                price = price * run.costMultiplier;
                price = run.player.items.findIndex((item: Item) => item.name === name) !== -1 ? Math.floor(price * 1.25) : price;
                return new Item(
                    'Epic',
                    name,
                    'Conditions for a critical are inverted',
                    (() => { }).bind(run),
                    Frequency.PASSIVE,
                    price,
                );
            })(),
            (() => {
                let price: number = 50;
                let name: string = 'Crit On Boss';
                price = price * run.costMultiplier;
                price = run.player.items.findIndex((item: Item) => item.name === name) !== -1 ? Math.floor(price * 1.25) : price;
                return new Item(
                    'Rare',
                    name,
                    '+1 Crit and Move on a boss fight',
                    (() => {
                        run.player.itemData.bossCrits += 1;
                        run.player.itemData.bossMoves += 1;
                    }).bind(run),
                    Frequency.PASSIVE,
                    price,
                );
            })(),
            (() => {
                let price: number = 50;
                let name: string = 'Extra Moves';
                price = price * run.costMultiplier;
                price = run.player.items.findIndex((item: Item) => item.name === name) !== -1 ? Math.floor(price * 1.25) : price;
                return new Item(
                    'Rare',
                    name,
                    '+2 moves',
                    (() => {
                        run.player.maxMoves += 2;
                    }).bind(run),
                    Frequency.PASSIVE,
                    price,
                );
            })(),
            (() => {
                let price: number = 75;
                let name: string = 'Horizontal Expansion';
                price = price * run.costMultiplier;
                price = run.player.items.findIndex((item: Item) => item.name === name) !== -1 ? Math.floor(price * 1.25) : price;
                return new Item(
                    'Rare',
                    name,
                    '+1 column',
                    (() => {
                        run.map.gridX++;
                    }).bind(run),
                    Frequency.PASSIVE,
                    price,
                );
            })(),
            (() => {
                let price: number = 75;
                let name: string = 'Vertical Expansion';
                price = price * run.costMultiplier;
                price = run.player.items.findIndex((item: Item) => item.name === name) !== -1 ? Math.floor(price * 1.25) : price;
                return new Item(
                    'Rare',
                    name,
                    '+1 row',
                    (() => {
                        run.map.gridY++;
                    }).bind(run),
                    Frequency.PASSIVE,
                    price,
                );
            })(),
            (() => {
                let price: number = 100;
                let name: string = 'More Options';
                price = price * run.costMultiplier;
                price = run.player.items.findIndex((item: Item) => item.name === name) !== -1 ? Math.floor(price * 1.25) : price;
                return new Item(
                    'Epic',
                    name,
                    '+1 boss item option',
                    (() => {
                        run.itemOptions++;
                    }).bind(run),
                    Frequency.PASSIVE,
                    price,
                );
            })(),

        ];

        if (run.possibleShapes.length >= 4) {
            let price: number = 200;
            price = price * run.costMultiplier;
            price = run.player.items.findIndex((item: Item) => item.name.startsWith('Ban')) !== -1 ? Math.floor(price * 1.25) : price;

            run.possibleShapes.forEach((shape: Shape) => {
                shopPool.push(new Item(
                    'Epic',
                    `Ban ${shape.id} pieces`,
                    `No more ${shape.id} pieces forever`,
                    (() => {
                        run.emit('Item:BanShape', shape.id);
                    }).bind(run),
                    Frequency.PASSIVE,
                    price,
                    true
                ));
            });
        }

        if (run.player.itemData.reach <= 4) {
            let price: number = 100;
            let name: string = 'Reach Expansion';
            price = price * run.costMultiplier;
            price = run.player.items.findIndex((item: Item) => item.name === name) !== -1 ? Math.floor(price * 1.25) : price;
            shopPool.push(new Item(
                'Rare',
                name,
                'Can reach +1 tile over',
                (() => {
                    run.player.itemData.reach++;
                }).bind(run),
                Frequency.PASSIVE,
                price
            ));
        }

        let uniqueItems = [
            (() => {
                let price: number = 100;
                let name: string = 'Extra Active Item';
                price = price * run.costMultiplier;
                price = run.player.items.findIndex((item: Item) => item.name === name) !== -1 ? Math.floor(price * 1.25) : price;
                return new Item(
                    'Rare',
                    name,
                    'One more slot for actives',
                    (() => { }).bind(run),
                    Frequency.PASSIVE,
                    price,
                    true,
                );
            })(),
            (() => {
                let price: number = 150;
                let name: string = 'Diagonal Reach';
                price = price * run.costMultiplier;
                price = run.player.items.findIndex((item: Item) => item.name === name) !== -1 ? Math.floor(price * 1.25) : price;
                return new Item(
                    'Epic',
                    name,
                    'Can match diagonals',
                    (() => { run.player.itemData.diagonals = true }).bind(run),
                    Frequency.PASSIVE,
                    price,
                    true,
                );
            })()
        ];

        return shopPool.concat(uniqueItems.filter((item: Item) => !run.player.hasItem(item.name)));
    }

    static defaultPool(run: Run): Item[] {
        let defaultPool: Item[] = [
            (() => {
                let name: string = 'Vertical AOE';
                return new Item(
                    'Rare',
                    name,
                    '+2% chance of column clearing pieces',
                    (() => {
                        let effectIndex: number = run.possibleEffects.findIndex((effect: Effect) => effect.id === name);

                        if (effectIndex === -1) {
                            run.possibleEffects.push(new Effect(name, (params: EffectParams) => {
                                run.emit('Item:ClearColumn', params);
                            }, 0.02));
                        } else {
                            run.possibleEffects[effectIndex].chance += 0.02;
                        }
                    }).bind(run)
                );
            })(),
            (() => {
                let name: string = 'Horizontal AOE';
                return new Item(
                    'Rare',
                    name,
                    '+2% chance of row clearing pieces',
                    (() => {
                        let effectIndex: number = run.possibleEffects.findIndex((effect: Effect) => effect.id === name);

                        if (effectIndex === -1) {
                            run.possibleEffects.push(new Effect(name, (params: EffectParams) => {
                                run.emit('Item:ClearRow', params);
                            }, 0.02))
                        } else {
                            run.possibleEffects[effectIndex].chance += 0.02;
                        }
                    }).bind(run)
                );
            })(),
            (() => {
                let name: string = 'Money';
                return new Item(
                    'Common',
                    name,
                    '+5% chance of pieces with gold',
                    (() => {
                        let effectIndex: number = run.possibleEffects.findIndex((effect: Effect) => effect.id === name);

                        if (effectIndex === -1) {
                            run.possibleEffects.push(new Effect(name, (params: EffectParams) => {
                                params.piece.effect = undefined
                                run.emit('Item:Money', params);
                            }, 0.05))
                        } else {
                            run.possibleEffects[effectIndex].chance += 0.05;
                        }
                    }).bind(run)
                );
            })(),
            new Item(
                'Common',
                'Extra Piece',
                'Matches can remove a random piece of the same color',
                (() => { }).bind(run),
            ),
            new Item(
                'Common',
                'Maybe More Options',
                '+1 Reroll',
                (() => {
                    run.player.itemData.rerolls += 1;
                }).bind(run),
            ),
            new Item(
                'Common',
                'Crit Chance',
                'Matches have +1% chance of critting',
                (() => {
                    run.player.itemData.criticalChance += 0.01;
                }).bind(run),
            ),
            new Item(
                'Epic',
                'Big Crit Chance',
                'Matches have +10% chance of critting',
                (() => {
                    run.player.itemData.criticalChance += 0.10;
                }).bind(run),
            ),
            new Item(
                'Rare',
                'Teleport',
                'Make a match anywhere',
                (() => {
                    run.emit('Item:AddOmniMove');
                }).bind(run),
                Frequency.EVERY_STAGE,
                undefined
            ),
            new Item(
                'Rare',
                'Extra Move',
                '+1 move',
                (() => {
                    run.player.maxMoves += 1;
                    run.player.moves += 1;
                }).bind(run)
            ),
            new Item(
                'Common',
                'Extra Crit',
                '+1 crit on grid',
                (() => {
                    run.player.critical += 1;
                }).bind(run)
            ),
            new Item(
                'Common',
                'Crit Multiplier',
                '+0.5 crit multiplier',
                (() => {
                    run.player.criticalMultiplier += 0.5;
                }).bind(run)
            ),
            new Item(
                'Common',
                'Max Health Gain',
                '+5% HP Max',
                (() => {
                    const health: number = (run.player.maxHealth / 20)
                    run.player.maxHealth += health;
                    run.player.heal(health);
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
                    run.player.heal(run.player.maxHealth / 10);
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
                'Rare',
                '4+ Match Regeneration',
                'Gain 1% HP every 4+ match',
                (() => { }).bind(run)
            ),
            new Item(
                'Rare',
                'Fair Trade',
                '10% chance of failing a move or healing 1',
                (() => { 

                }).bind(run)
            ),
            new Item(
                'Rare',
                'Another Fair Trade',
                '10% chance of losing 1% health or recovering this move + 1',
                (() => { 

                }).bind(run)
            ),
            new Item(
                'Rare',
                'Move Saver',
                '10% chance of not consuming moves',
                (() => {
                    run.player.itemData.moveSaverChance += 0.10;
                }).bind(run)
            ),
            new Item(
                'Rare',
                'Shield',
                'Block one letal hit',
                (() => {
                    run.player.itemData.hasShield = true;
                    run.player.itemData.hasUsedShield = false;
                }).bind(run),
                Frequency.PASSIVE,
                undefined,
                true
            ),
            new Item(
                'Rare',
                'Big Max Health Gain',
                '+20% HP Max',
                (() => {
                    const health: number = (run.player.maxHealth / 5)
                    run.player.maxHealth += health;
                    run.player.heal(health);
                }).bind(run)
            ),
            new Item(
                'Epic',
                'Big Crit Boost',
                '+2 crits on grid and multiplier',
                (() => {
                    run.player.criticalMultiplier += 1;
                    run.player.critical += 2;
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
                'Common',
                `Eliminate all ${shape.id} pieces`,
                `Remove current ${shape.id} pieces`,
                (() => {
                    run.stackCombo = true;
                    run.emit('Item:EliminateShape', shape.id);
                }).bind(run),
                Frequency.SINGLE_USE
            ));

            defaultPool.push(new Item(
                'Common',
                `${shape.id.charAt(0).toUpperCase() + shape.id.slice(1)} Color Boost`,
                `+50 base DMG on ${shape.id} matches`,
                (() => {
                    run.emit('Item:ColorDamageBoost', shape.id, 50);
                }).bind(run)
            ));

        });

        let uniqueItems = [
            new Item(
                'Epic',
                'Combos Multiply DMG',
                'Final DMG multiplies combo counter',
                (() => { }).bind(run),
                undefined,
                undefined,
                true
            ),
            new Item(
                'Epic',
                'Crits are Moves',
                'Extra move for every Crit you have currently',
                (() => {
                    run.player.moves += run.player.critical;
                    run.player.itemData.bonusMoves = run.player.critical;
                    run.updateMoves();
                }).bind(run),
                undefined,
                undefined,
                true
            ),
            new Item(
                'Rare',
                'Valuable Combo',
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
            new Item(
                'Rare',
                'Gold Fees',
                'Every third time get double gold',
                (() => { run.player.itemData.goldAddCount = 0; }).bind(run),
                undefined,
                undefined,
                true
            ),
        ];

        return defaultPool.concat(uniqueItems.filter((item: Item) => !run.player.hasItem(item.name)));
    }
}
