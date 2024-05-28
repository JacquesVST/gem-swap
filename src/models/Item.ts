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

    static rarityColors(): { [key: string]: { color: Color, chance: number, chanceShop: number } } {
        return {
            'Common': {
                color: new Color(224, 224, 224),
                chance: 0.75,
                chanceShop: 0.50
            },
            'Rare': {
                color: new Color(101, 206, 80),
                chance: 0.95,
                chanceShop: 0.80
            },
            'Epic': {
                color: new Color(84, 80, 206),
                chance: 1,
                chanceShop: 1
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
                if (chance < (shop ? Item.rarityColors()[rarities[index]].chanceShop : Item.rarityColors()[rarities[index]].chance) || index === rarities.length - 1) {
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
        price = run.player.items.findIndex((item: Item) => item.name === name) !== -1 ? Math.floor(price * 1.25) : price;
        return new Item(
            'Common',
            name,
            'Full heal',
            (() => {
                run.player.heal(run.player.health);
            }).bind(run),
            price,
        );
    }

    static shopPool(run: Run): Item[] {
        let shopPool: Item[] = [
            (() => {
                let price: number = 30;
                let name: string = 'Crit On Boss';
                price = price * run.costMultiplier;
                price = run.player.items.findIndex((item: Item) => item.name === name) !== -1 ? Math.floor(price * 1.25) : price;
                return new Item(
                    'Common',
                    name,
                    '+1 Crit piece on a boss fight',
                    (() => {
                        run.player.itemData.bossCritical += 1;
                    }).bind(run),
                    price,
                );
            })(),
            (() => {
                let price: number = 50;
                let name: string = 'Extra Moves';
                price = price * run.costMultiplier;
                price = run.player.items.findIndex((item: Item) => item.name === name) !== -1 ? Math.floor(price * 1.25) : price;
                return new Item(
                    'Common',
                    name,
                    '+3 moves',
                    (() => {
                        run.maxMoves += 3;
                    }).bind(run),
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
                    price,
                );
            })(),

        ];

        if (run.possibleShapes.length >= 4) {
            let price: number = 150;
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
                    price
                ));
            });
        }

        if (run.player.itemData.reach <= 3) {
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
                    price,
                    undefined,
                    true
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
                    (() => { }).bind(run),
                    price,
                    undefined,
                    true
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
                'Matches can remove a random piece',
                (() => { }).bind(run)
            ),
            new Item(
                'Common',
                'Teleport',
                'Make a match anywhere',
                (() => { 
                    run.emit('Item:AddOmniMove');
                }).bind(run),
                undefined,
                true
            ),
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
                'Rare',
                '4+ Match Regeneration',
                'Gain 1% HP every 4+ match',
                (() => { }).bind(run)
            ),
            new Item(
                'Rare',
                'Move Saver',
                '10% chance of not consuming moves',
                (() => {
                    run.player.itemData.moveSaver += 0.10;
                }).bind(run)
            ),
            new Item(
                'Rare',
                'Shield',
                'Block one letal hit',
                (() => {
                    run.player.itemData.hasShield = true;
                    run.player.itemData.usedShield = false;
                }).bind(run),
                undefined,
                undefined,
                true
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
            defaultPool.push(new Item(
                'Common',
                `${shape.id.charAt(0).toUpperCase() + shape.id.slice(1)} Boost`,
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
                'Moves as you Crits',
                'Extra move for every Crit you have currently',
                (() => { 
                    run.player.moves += run.player.critical;
                    run.itemData.bonusMoves = run.player.critical;
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
