import { Frequency, IItem } from "../interfaces";
import { Color } from "./Color";
import { Effect, EffectParams } from "./Effect";
import { Player } from "./Player";
import { Run } from "./Run";
import { Shape } from "./Shape";

const UNIQUE = true;

export class Item implements IItem {
    rarity: string;
    name: string;
    description: string;
    effect: () => void;
    price: number;
    count: number = 0;

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
        const itemsOfRarity: Item[][] = [];
        const counts = {};

        for (let i: number = 0; i < amount; i++) {
            let chance = Math.random() + player.luck / 200;

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

        const itemList: Item[] = [];
        itemsOfRarity.forEach((items: Item[]) => {
            items = items.filter((item: Item) => !(player.hasItem(item.name) && item.unique));
            const initialLength: number = itemList.length;
            do {
                const random: number = Math.floor(Math.random() * items.length);

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
                'Can only match 4 pieces or more, damage is quadrupled',
                () => { }
            ),
            new Item(
                'Passive',
                'Collector',
                'Start with a relic and +50% increase on relic effects',
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
                '+3 rerolls and +1 once every floor, unused rerolls will stack',
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
                'Midas Touched The Walls',
                '+1 Gold for matches with pieces on the extremities, +2 on critical',
                () => { }
            ),
            new Item(
                'Passive',
                'Natural Critical',
                'Innate 5% critical chance on every match, +75% critical multiplier',
                () => { }
            ),
            new Item(
                'Passive',
                'No Barriers',
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
                'Making matches fills a timer that multiplies damage',
                () => { }
            )
        ]
        return passivePool;
    }

    static freeRelicItem(run: Run, callback: () => void): Item {
        return new Item(
            'Rare',
            'Free Relic',
            'Gain a random Relic',
            (() => {
                run.newRandomDropDialog(true, [], callback);
            }).bind(run)
        );
    }

    static fullHealthShopItem(run: Run): Item {
        return new Item(
            'Common',
            '50% Instant health',
            'Heal 50% of max health',
            (() => {
                run.player.heal(run.player.maxHealth / 2);
            }).bind(run),
            Frequency.PASSIVE,
            Math.floor(20 * run.runConfig.item.costMultiplier / 100 * (1 + (run.player.hasItem('50% Instant health') * 0.25)))
        );
    }

    static shopPool(run: Run): Item[] {
        let shopPool: Item[] = [

            // Rare
            new Item(
                'Rare',
                'Boss Preparation',
                '+1 Critical and Move on a boss fight',
                (() => {
                    run.player.itemData.bossCritical += 1;
                    run.player.itemData.bossMoves += 1;
                }).bind(run),
                Frequency.PASSIVE,
                50,
            ),
            new Item(
                'Rare',
                'Extra Moves',
                '+2 moves',
                (() => run.player.maxMoves += 2).bind(run),
                Frequency.PASSIVE,
                75,
            ),
            new Item(
                'Rare',
                'Horizontal Expansion',
                '+1 column',
                (() => run.map.gridWidth++).bind(run),
                Frequency.PASSIVE,
                75,
            ),
            new Item(
                'Rare',
                'Vertical Expansion',
                '+1 row',
                (() => run.map.gridHeight++).bind(run),
                Frequency.PASSIVE,
                75,
            ),
            (() => {
                let name: string = 'Vertical AOE';
                return new Item(
                    'Rare',
                    name,
                    '+2.5% chance of column clearing pieces',
                    (() => {
                        let effectIndex: number = run.possibleEffects.findIndex((effect: Effect) => effect.id === name);

                        if (effectIndex === -1) {
                            run.possibleEffects.push(new Effect(name, (params: EffectParams) => {
                                run.emit('Item:ClearColumn', params);
                            }, 0.025));
                        } else {
                            run.possibleEffects[effectIndex].chance += 0.025;
                        }
                    }).bind(run),
                    Frequency.PASSIVE,
                    100
                );
            })(),
            (() => {
                let name: string = 'Horizontal AOE';
                return new Item(
                    'Rare',
                    name,
                    '+2.5% chance of row clearing pieces',
                    (() => {
                        let effectIndex: number = run.possibleEffects.findIndex((effect: Effect) => effect.id === name);

                        if (effectIndex === -1) {
                            run.possibleEffects.push(new Effect(name, (params: EffectParams) => {
                                run.emit('Item:ClearRow', params);
                            }, 0.025))
                        } else {
                            run.possibleEffects[effectIndex].chance += 0.025;
                        }
                    }).bind(run),
                    Frequency.PASSIVE,
                    100
                );
            })(),

            //Epic
            new Item(
                'Epic',
                'More Options',
                '+1 item option',
                (() => run.runConfig.item.itemOptions++).bind(run),
                Frequency.PASSIVE,
                100,
            ),
            new Item(
                'Epic',
                'tirC',
                'Conditions for a critical are inverted',
                (() => { }).bind(run),
                Frequency.PASSIVE,
                100,
            ),
        ];

        if (run.player.itemData.reach <= 4) {
            shopPool.push(new Item(
                'Rare',
                'Reach Expansion',
                'Can reach +1 tile over',
                (() => run.player.itemData.reach++).bind(run),
                Frequency.PASSIVE,
                100,
            ));
        }

        if (run.possibleShapes.length > 4) {
            run.possibleShapes.forEach((shape: Shape) => {
                shopPool.push(new Item(
                    'Epic',
                    `Ban ${shape.id} pieces`,
                    `No more ${shape.id} pieces forever`,
                    (() => run.emit('Item:BanShape', shape.id)).bind(run),
                    Frequency.PASSIVE,
                    200,
                    UNIQUE
                ));
            });
        }

        const random: number = Math.floor(Math.random() * run.possibleShapes.length);
        const shape: Shape = run.possibleShapes[random]
        shopPool.push(new Item(
            'Rare',
            `${shape.id.charAt(0).toUpperCase() + shape.id.slice(1)} Damage Concentration`,
            `All owned color damage boosts goes to ${shape.id}`,
            (() => run.emit('Item:ConcentrateColor', shape.id)).bind(run),
            Frequency.PASSIVE,
            50,
        ));

        const uniqueItems = [
            new Item(
                'Rare',
                'Extra Active Item',
                'One more slot for actives',
                (() => { }).bind(run),
                Frequency.PASSIVE,
                100,
                UNIQUE,
            ),
            new Item(
                'Epic',
                'Diagonal Reach',
                'Can match diagonals',
                (() => { run.player.itemData.diagonals = true }).bind(run),
                Frequency.PASSIVE,
                150,
                UNIQUE,
            )
        ];

        shopPool = shopPool.concat(uniqueItems.filter((item: Item) => !run.player.hasItem(item.name)));

        shopPool.forEach((item: Item) => {
            if (!item.name.startsWith('Ban') && !item.name.endsWith('AOE')) {
                item.price = item.price * (run.runConfig.item.costMultiplier / 100) * (1 + (run.player.hasItem(item.name) * 0.25));
            } else if (item.name.endsWith('AOE')) {
                item.price = item.price * (run.runConfig.item.costMultiplier / 100) * (1 + (run.player.hasItem(item.name) * 0.5));
            } else {
                item.price = item.price * (run.runConfig.item.costMultiplier / 100) * (1 + (run.player.items.filter((playerItem: Item) => playerItem.name.startsWith('Ban')).length * 0.4));
            }
            item.price = Math.floor(item.price);
        });

        return shopPool;
    }

    static defaultPool(run: Run): Item[] {
        let defaultPool: Item[] = [

            // Items with Effects
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

            // Common
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
                'Critical Chance',
                'Matches have +2% chance of being critical',
                (() => {
                    run.player.criticalChance += 2;
                }).bind(run),
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
                '+50% critical multiplier',
                (() => {
                    run.player.criticalMultiplier += 50;
                }).bind(run)
            ),
            new Item(
                'Common',
                'Max Health Gain',
                '+5 HP Max',
                (() => {
                    const health: number = 5;
                    run.player.maxHealth += health;
                    run.player.heal(health);
                }).bind(run)
            ),
            new Item(
                'Common',
                'Defense Gain',
                '+4 Defense',
                (() => {
                    run.player.defense += 4;
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
                    run.player.attack += 30;
                }).bind(run)
            ),

            // Rare
            new Item(
                'Rare',
                'Defense Boost',
                '+8 defense',
                (() => {
                    run.player.defense += 8;
                }).bind(run)
            ),
            new Item(
                'Rare',
                'Teleport',
                'Make a match anywhere',
                (() => {
                    run.emit('Item:AddFullReachMove');
                }).bind(run),
                Frequency.EVERY_STAGE,
                undefined
            ),
            new Item(
                'Rare',
                'Universal Tradeoff',
                '50% of your color damage becomes base damage',
                (() => run.emit('Item:UniversalTradeoff')).bind(run),
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
                'Rare',
                '4+ Match Regeneration',
                'Gain 1 HP every 4+ match',
                (() => { }).bind(run)
            ),
            new Item(
                'Rare',
                'Fair Trade',
                '10% chance of failing a move or healing 1%',
                (() => { }).bind(run)
            ),
            new Item(
                'Rare',
                'Another Fair Trade',
                '10% chance of losing 1% health or saving a move',
                (() => { }).bind(run)
            ),
            new Item(
                'Rare',
                'Move Saver',
                '8% chance of not consuming moves',
                (() => run.player.itemData.moveSaverChance += 0.08).bind(run)
            ),
            new Item(
                'Rare',
                'Shield',
                'Block one lethal hit',
                (() => {
                    run.player.itemData.hasShield = true;
                    run.player.itemData.hasUsedShield = false;
                }).bind(run),
                Frequency.PASSIVE,
                undefined,
                UNIQUE
            ),
            new Item(
                'Rare',
                'Big Max Health Gain',
                '+20 HP Max',
                (() => {
                    const health: number = 20
                    run.player.maxHealth += health;
                    run.player.heal(health);
                }).bind(run)
            ),
            new Item(
                'Epic',
                'All Stats Up',
                'Small Increase on all stats',
                (() => {
                    run.emit('Item:AllStatsUp')
                }).bind(run)
            ),
            new Item(
                'Epic',
                'All Stats Down?',
                'Small Decrease on all stats but +150 attack',
                (() => {
                    run.emit('Item:AllStatsDown')
                }).bind(run)
            ),
            new Item(
                'Epic',
                'Big Critical Boost',
                '+2 critical on grid and +100% multiplier',
                (() => {
                    run.player.criticalMultiplier += 100;
                    run.player.critical += 2;
                }).bind(run)
            ),
            new Item(
                'Epic',
                'Big Damage Boost',
                '+75% DMG multiplier',
                (() => run.player.damageMultiplier += 75).bind(run)
            ),
            new Item(
                'Epic',
                '10% Sale',
                'Shop prices discounted',
                (() => run.runConfig.item.costMultiplier *= 0.9).bind(run)
            ),
            new Item(
                'Epic',
                'Big Critical Chance',
                'Matches have +10% chance of being critical',
                (() => run.player.criticalChance += 10).bind(run),
            ),
        ];

        run.possibleShapes.forEach((shape: Shape) => {
            defaultPool.push(new Item(
                'Common',
                `${shape.id.charAt(0).toUpperCase() + shape.id.slice(1)} Color Boost`,
                `+50 base DMG on ${shape.id} shapes`,
                (() => {
                    run.emit('Item:ColorDamageBoost', shape.id, 50);
                }).bind(run)
            ));

        });

        const random: number = Math.floor(Math.random() * run.possibleShapes.length);
        const shape: Shape = run.possibleShapes[random]
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

        let uniqueItems = [
            new Item(
                'Rare',
                'Valuable Combo',
                'Get 1 gold every combo over 1',
                (() => { }).bind(run),
                undefined,
                undefined,
                UNIQUE
            ),
            new Item(
                'Rare',
                'Hit Streak',
                'Bonus DMG for Consecutive matches',
                (() => { run.consecutiveCombo = 0; }).bind(run),
                undefined,
                undefined,
                UNIQUE
            ),
            new Item(
                'Rare',
                'Gold Fees',
                'Every third time get double gold',
                (() => { run.player.itemData.goldAddCount = 0; }).bind(run),
                undefined,
                undefined,
                UNIQUE
            ),
            new Item(
                'Epic',
                'Combos Multiply DMG',
                'Final DMG multiplies combo counter',
                (() => { }).bind(run),
                undefined,
                undefined,
                UNIQUE
            ),
            new Item(
                'Epic',
                'XP Boost',
                '+50% XP from enemies',
                (() => { }).bind(run),
                undefined,
                undefined,
                UNIQUE
            ),
            new Item(
                'Epic',
                '2 Critical, 1 Move',
                'Extra move for every 2 Critical you have',
                (() => {
                    run.player.moves += Math.floor(run.player.critical / 2);
                    run.player.itemData.bonusMoves = Math.floor(run.player.critical / 2);
                    run.updateMoves();
                }).bind(run),
                undefined,
                undefined,
                UNIQUE
            ),
        ];

        return defaultPool.concat(uniqueItems.filter((item: Item) => !run.player.hasItem(item.name)));
    }
}
