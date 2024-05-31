import * as P5 from "p5";
import { Canvas } from "../controllers/Canvas";
import { DialogController } from "../controllers/DialogController";
import { EventEmitter } from "../controllers/EventEmitter";
import { Frequency, ICanvas, IDamageData, IPlayer, IPlayerItemData } from "../interfaces";
import { drawItem } from "../utils/Draw";
import { formatNumber, insertLineBreaks } from "../utils/General";
import { Color } from "./Color";
import { Enemy } from "./Enemy";
import { Item } from "./Item";
import { Limits } from "./Limits";
import { Position } from "./Position";
import { Run } from "./Run";

export class Player extends EventEmitter implements IPlayer {
    health: number;
    maxHealth: number;
    moves: number;
    maxMoves: number;
    attack: number;
    defense: number;

    damageMultiplier: number = 1;
    criticalMultiplier: number = 1.5;
    critical: number = 1;
    gold: number = 0;
    xp: number = 0;

    hasInventoryOpen: boolean = false;
    hasStatsOpen: boolean = false;

    passive: Item;
    items: Item[] = [];
    itemData: PlayerItemData = {
        activeItem: undefined,
        activeItemLimits: undefined,
        activeItem2: undefined,
        activeItem2Limits: undefined,
        passiveLimits: undefined,
        bonusMoves: 0,
        bossCrits: 0,
        diagonals: false,
        goldAddCount: 0,
        hasShield: false,
        hasUsedShield: false,
        moveSaverChance: 0,
        omniMoves: 0,
        reach: 1,
        criticalChance: 0,
        rerolls: 0
    }

    constructor(health: number, moves: number, attack: number, defense: number, passive?: Item) {
        super('Player');
        this.maxHealth = health;
        this.maxMoves = moves;
        this.attack = attack;
        this.defense = defense;

        this.passive = passive;
        this.moves = moves;
        this.health = health;

        this.configurePassive();
        this.configureListeners();
    }

    static defaultPlayerWith(item: Item): Player {
        return new Player(100, 10, 100, 0, item);
    }

    get totalMoves(): number {
        return this.maxMoves + this.itemData.bonusMoves;
    }

    configurePassive(): void {
        switch (this.passive?.name) {
            case 'Natural Crit':
                this.criticalMultiplier = 2;
                this.itemData.criticalChance = 0.05;
                break;
            case '4x4':
                this.damageMultiplier = 3;
                break;
            case 'Flexible':
                this.itemData.diagonals = true;
                break;
            case 'Gambler':
                this.itemData.rerolls = 1
                break;
            case 'Tank':
                this.defense = 10;
                this.maxMoves -= 2;
                this.moves -= 2;
                break;
        }
    }

    configureListeners(): void {
        this.on('Main:KeyPressed', (event: KeyboardEvent, run: Run) => {
            if ((event.key === 'i' || event.key === 'I') && !run.hasDialogOpen) {
                this.hasInventoryOpen = !this.hasInventoryOpen;
            }

            if ((event.key === 's' || event.key === 'S') && !run.hasDialogOpen) {
                this.hasStatsOpen = !this.hasStatsOpen;
            }
        });

        this.on('Main:KeyReleased', (event: KeyboardEvent, run: Run) => {
            if (event.key === ' ') {
                this.useActiveItem(run);
            }

            if (event.key === 'Enter') {
                this.useActiveItem2(run);
            }
        });

        this.on('Main:MouseClicked:Click', (position: Position, run?: Run) => {
            setTimeout(() => {
                if (DialogController.getInstance().currentDialog) {
                    return;
                }

                if (this.itemData.activeItem) {
                    if (this.itemData.activeItemLimits.contains(position)) {
                        this.useActiveItem(run);
                    }
                }

                if (this.itemData.activeItem2) {
                    if (this.itemData.activeItem2Limits.contains(position)) {
                        this.useActiveItem2(run);
                    }
                }
            }, 0);
        });

        this.on('Run:Item:AddOmniMove', () => {
            this.itemData.omniMoves++;
        });

        this.on('Grid:GridStabilized:Init', () => {
            if (this.itemData.activeItem && this.itemData.activeItem.frequency === Frequency.EVERY_STAGE) {
                this.itemData.activeItem.disabled = false;
            }

            if (this.itemData.activeItem2 && this.itemData.activeItem2.frequency === Frequency.EVERY_STAGE) {
                this.itemData.activeItem2.disabled = false;
            }

            if (this.passive?.name === 'Gambler') {
                this.itemData.rerolls = 1;
            }
        });

        this.on('Grid:OmniMoveDone', () => {
            this.itemData.omniMoves--;
        });

        this.on('Run:MidasTouched', (gold: number) => {
            this.addGold(gold)
        });

    }

    get movesEnded(): boolean {
        return this.moves === 0;
    }

    useActiveItem(run: Run): void {
        if (this.itemData.activeItem && !this.itemData.activeItem.disabled) {
            this.itemData.activeItem.effect();
            if (this.itemData.activeItem.frequency === Frequency.SINGLE_USE) {
                this.itemData.activeItem = undefined;
            } else {
                this.itemData.activeItem.disabled = true
            }
            run.sounds['item'].play();
        }
    }

    useActiveItem2(run: Run): void {
        if (this.hasItem('Extra Active Item') && this.itemData.activeItem2 && !this.itemData.activeItem2.disabled) {
            this.itemData.activeItem2.effect();
            if (this.itemData.activeItem2.frequency === Frequency.SINGLE_USE) {
                this.itemData.activeItem2 = undefined;
            } else {
                this.itemData.activeItem2.disabled = true
            }
            run.sounds['item'].play();
        }
    }


    hasItem(name: string): boolean {
        return this.items.map((item: Item) => item.name).includes(name);
    }

    heal(heal: number): void {
        if (this.health + heal > this.maxHealth) {
            heal = this.maxHealth - this.health;
        }

        this.health += heal;
    }

    addGold(gold: number): void {
        if (gold !== 0) {
            if (gold > 0) {
                this.itemData.goldAddCount++;
                if (this.hasItem('Gold Fees') && this.itemData.goldAddCount % 3 === 0) {
                    this.itemData.goldAddCount = 0;
                    gold *= 2;
                }
            }
            this.gold = Math.floor(this.gold + gold);
            this.emit('AddedGold', gold)
        }
    }

    simulateDamage(enemy: Enemy): IDamageData {
        let damage: number = enemy.health > 0 ? enemy.attack : 0;

        if (!damage || !parseInt(damage + '', 10)) {
            damage = 0;
        }

        let shielded = false;
        damage = (damage - this.defense < 0) ? 0 : (damage - this.defense);

        if (this.itemData.hasShield && !this.itemData.hasUsedShield) {
            if (damage >= this.health) {
                damage = 0;
                this.itemData.hasUsedShield = true;
                this.items = this.items.filter((item: Item) => item.name !== 'Shield');
                shielded = true;
            }
        } else {
            if (damage > this.health) {
                damage = this.health;
            }
        }

        return { damage, shielded };
    }

    damage(damage: IDamageData): void {
        this.health -= damage.damage;

        this.emit('PlayerDamaged', this);

        if (this.health <= 0) {
            this.emit('PlayerDied');
        }
    }

    updateMoves(newMoves: number): void {
        this.moves = newMoves;

        this.emit('MovesUpdated', this)
    }

    draw(): void {
        const canvas: ICanvas = Canvas.getInstance();
        const p5: P5 = canvas.p5;

        const itemMarginX: number = canvas.margin + ((canvas.margin * 1.5 + canvas.itemSideSize + canvas.gridData.horizontalCenterPadding / 2 - canvas.padding) / 2) - (canvas.itemSideSize / 2);

        if (canvas.horizontalLayout) {
            // active item slots
            if (!this.hasStatsOpen) {

                const activeSlotX: number = itemMarginX
                const activeSlotY: number = (canvas.windowSize.y / 2) - (canvas.itemSideSize / 2);

                const activeSlotX2: number = itemMarginX + canvas.itemSideSize / 4;
                const activeSlotY2: number = activeSlotY - canvas.margin * 1.5 - canvas.itemSideSize / 2

                const passiveSlotX: number = itemMarginX + canvas.itemSideSize / 4;
                const passiveSlotY: number = activeSlotY + canvas.itemSideSize + canvas.margin * 1.5

                this.itemData.activeItemLimits = new Limits(new Position(activeSlotX, activeSlotY), new Position(activeSlotX + canvas.itemSideSize, activeSlotY + canvas.itemSideSize))
                this.itemData.activeItem2Limits = new Limits(new Position(activeSlotX2, activeSlotY2), new Position(activeSlotX2 + canvas.itemSideSize / 2, activeSlotY2 + canvas.itemSideSize / 2))
                this.itemData.passiveLimits = new Limits(new Position(passiveSlotX, passiveSlotY), new Position(passiveSlotX + canvas.itemSideSize / 2, passiveSlotY + canvas.itemSideSize / 2))

                const opacity1: number = this.itemData.activeItemLimits.contains(canvas.mousePosition) ? 200 : 255;
                const opacity2: number = this.itemData.activeItem2Limits.contains(canvas.mousePosition) ? 200 : 255;
                const opacity3: number = this.itemData.passiveLimits.contains(canvas.mousePosition) ? 200 : 255;


                (p5.drawingContext as CanvasRenderingContext2D).setLineDash([10, 10]);
                p5.fill(Color.GRAY_3.alpha(opacity1).value);
                p5.rect(
                    activeSlotX,
                    activeSlotY,
                    canvas.itemSideSize,
                    canvas.itemSideSize,
                    canvas.radius
                );

                if (this.hasItem('Extra Active Item')) {
                    p5.fill(Color.GRAY_3.alpha(opacity2).value);
                    p5.rect(
                        activeSlotX2,
                        activeSlotY2,
                        canvas.itemSideSize / 2,
                        canvas.itemSideSize / 2,
                        canvas.radius
                    );
                }

                p5.fill(Color.GRAY_3.alpha(opacity3).value);
                p5.rect(
                    passiveSlotX,
                    passiveSlotY,
                    canvas.itemSideSize / 2,
                    canvas.itemSideSize / 2,
                    canvas.radius
                );

                (p5.drawingContext as CanvasRenderingContext2D).setLineDash([]);

                // slot 1
                if (this.itemData.activeItem) {
                    const color: Color = this.itemData.activeItem.disabled ? Color.GRAY_3 : Item.rarityColors[this.itemData.activeItem.rarity].color.alpha(opacity1);

                    p5.fill(color.value);
                    p5.rect(
                        activeSlotX,
                        activeSlotY,
                        canvas.itemSideSize,
                        canvas.itemSideSize,
                        canvas.radius
                    );

                    p5.textAlign(p5.CENTER, p5.CENTER)
                    p5.textSize(20)
                    let name: string = insertLineBreaks(this.itemData.activeItem.name, p5.map(canvas.itemSideSize - canvas.margin, 0, p5.textWidth(this.itemData.activeItem.name), 0, this.itemData.activeItem.name.length));

                    p5.fill(Color.WHITE.value);
                    p5.stroke(Color.BLACK.value);
                    p5.strokeWeight(3);
                    p5.text(
                        name,
                        activeSlotX + canvas.itemSideSize / 2,
                        canvas.windowSize.y / 2,
                    );

                    p5.textAlign(p5.CENTER, p5.BOTTOM)
                    p5.fill(Color.WHITE_1.value);
                    p5.strokeWeight(2);
                    p5.textSize(16)
                    p5.text(
                        'Space',
                        activeSlotX + canvas.itemSideSize / 2,
                        activeSlotY + canvas.itemSideSize + - canvas.padding
                    );

                }

                // slot 2
                if (this.hasItem('Extra Active Item') && this.itemData.activeItem2) {
                    const color: Color = this.itemData.activeItem2.disabled ? Color.GRAY_3 : Item.rarityColors[this.itemData.activeItem2.rarity].color.alpha(opacity2);

                    p5.fill(color.value);
                    p5.rect(
                        activeSlotX2,
                        activeSlotY2,
                        canvas.itemSideSize / 2,
                        canvas.itemSideSize / 2,
                        canvas.radius
                    );

                    p5.textAlign(p5.CENTER, p5.CENTER)
                    p5.textSize(20)
                    let name: string = insertLineBreaks(this.itemData.activeItem2.name, p5.map(canvas.itemSideSize - canvas.margin, 0, p5.textWidth(this.itemData.activeItem2.name), 0, this.itemData.activeItem2.name.length));

                    p5.fill(Color.WHITE.value);
                    p5.stroke(Color.BLACK.value);
                    p5.strokeWeight(3);
                    p5.text(
                        name,
                        activeSlotX2 + canvas.itemSideSize / 4,
                        activeSlotY2 + canvas.itemSideSize / 4,
                    );

                    p5.textAlign(p5.CENTER, p5.BOTTOM)
                    p5.fill(Color.WHITE_1.value);
                    p5.strokeWeight(2);
                    p5.textSize(16)
                    p5.text(
                        'Enter',
                        activeSlotX2 + canvas.itemSideSize / 4,
                        activeSlotY2 + canvas.itemSideSize / 2 - canvas.padding
                    );

                }

                //passive
                if (this.passive) {
                    const color: Color = this.passive?.disabled ? Color.GRAY_3 : Item.rarityColors[this.passive.rarity].color.alpha(opacity3);

                    p5.fill(color.value);
                    p5.rect(
                        passiveSlotX,
                        passiveSlotY,
                        canvas.itemSideSize / 2,
                        canvas.itemSideSize / 2,
                        canvas.radius
                    );

                    p5.textAlign(p5.CENTER, p5.CENTER)
                    p5.textSize(20)

                    let name: string = insertLineBreaks(this.passive.name, p5.map(canvas.itemSideSize - canvas.margin, 0, p5.textWidth(this.passive.name), 0, this.passive.name.length));

                    p5.fill(Color.WHITE.value);
                    p5.stroke(Color.BLACK.value);
                    p5.strokeWeight(3);
                    p5.text(
                        name,
                        passiveSlotX + canvas.itemSideSize / 4,
                        passiveSlotY + canvas.itemSideSize / 4,
                    );

                    p5.textAlign(p5.CENTER, p5.BOTTOM)
                    p5.fill(Color.WHITE_1.value);
                    p5.strokeWeight(2);
                    p5.textSize(16)
                    p5.text(
                        'Passive',
                        passiveSlotX + canvas.itemSideSize / 4,
                        passiveSlotY + canvas.itemSideSize / 2 - canvas.padding
                    );

                }
            }

            if (this.hasStatsOpen) {
                let height: number = canvas.itemSideSize / 4;
                let marginY: number = canvas.windowSize.y / 2;

                let marginX: number = itemMarginX + canvas.padding;

                p5.noStroke()
                p5.fill(Color.GRAY_3.value);
                p5.rect(
                    itemMarginX,
                    marginY - (height * 3),
                    canvas.itemSideSize,
                    height * 6,
                    canvas.radius
                );

                p5.fill(Color.WHITE.value);
                p5.stroke(Color.BLACK.value);
                p5.strokeWeight(3);

                // attack
                p5.textAlign(p5.LEFT, p5.CENTER)
                p5.textSize(16)
                p5.text(
                    'Attack',
                    marginX,
                    marginY - height * 2.5
                );

                p5.textAlign(p5.RIGHT, p5.CENTER)
                p5.textSize(20)
                p5.text(
                    `${formatNumber(this.attack)}`,
                    marginX + canvas.itemSideSize - canvas.padding * 2,
                    marginY - height * 2.5
                );

                // defense
                p5.textAlign(p5.LEFT, p5.CENTER)
                p5.textSize(16)
                p5.text(
                    'Defense',
                    marginX,
                    marginY - height * 1.5
                );

                p5.textAlign(p5.RIGHT, p5.CENTER)
                p5.text(
                    `${formatNumber(this.defense)}`,
                    marginX + canvas.itemSideSize - canvas.padding * 2,
                    marginY - height * 1.5
                );

                // crit count
                p5.textAlign(p5.LEFT, p5.CENTER)
                p5.textSize(16)
                p5.text(
                    'Crit Count',
                    marginX,
                    marginY - height * 0.5
                );

                p5.textAlign(p5.RIGHT, p5.CENTER)
                p5.text(
                    `${formatNumber(this.critical)}`,
                    marginX + canvas.itemSideSize - canvas.padding * 2,
                    marginY - height * 0.5
                );

                // crit damage
                p5.textAlign(p5.LEFT, p5.CENTER)
                p5.textSize(16)
                p5.text(
                    'Crit Damage',
                    marginX,
                    marginY + height * 0.5
                );

                p5.textAlign(p5.RIGHT, p5.CENTER)
                p5.textSize(20)
                p5.text(
                    `${Math.floor((this.criticalMultiplier - 1) * 100)}%`,
                    marginX + canvas.itemSideSize - canvas.padding * 2,
                    marginY + height * 0.5
                );

                // damage multiplier
                p5.textAlign(p5.LEFT, p5.CENTER)
                p5.textSize(16)
                p5.text(
                    'Multiplier',
                    marginX,
                    marginY + height * 1.5
                );

                p5.textAlign(p5.RIGHT, p5.CENTER)
                p5.textSize(20)
                p5.text(
                    `${Math.floor((this.damageMultiplier) * 100)}%`,
                    marginX + canvas.itemSideSize - canvas.padding * 2,
                    marginY + height * 1.5
                );

                // xp
                p5.textAlign(p5.LEFT, p5.CENTER)
                p5.textSize(16)
                p5.text(
                    'XP',
                    marginX,
                    marginY + height * 2.5
                );

                p5.textAlign(p5.RIGHT, p5.CENTER)
                p5.textSize(20)
                p5.text(
                    `${Math.floor(this.xp)}`,
                    marginX + canvas.itemSideSize - canvas.padding * 2,
                    marginY + height * 2.5
                );

            }


            if (this.hasInventoryOpen && this.items.length) {

                p5.noStroke();
                p5.fill(50, 50, 50, 100);
                p5.rect(
                    0,
                    0,
                    canvas.windowSize.x,
                    canvas.windowSize.y,
                );

                let sideSize: number = canvas.itemSideSize / Math.ceil(this.items.length / 20);
                let dimension: Position = new Position(0, 0);
                let margin: Position = new Position(0, 0);

                let textMarginCount: number = 3;
                let lengthOffSet: number = 4 + Math.ceil(this.items.length / 20);
                let maxLength: number = this.items.length > lengthOffSet ? lengthOffSet : this.items.length

                dimension.x = maxLength * sideSize + ((maxLength + 1) * canvas.margin);
                margin.x = (canvas.playfield.x / 2) - (dimension.x / 2);

                dimension.y = (Math.ceil(this.items.length / lengthOffSet) * sideSize) + ((Math.ceil(this.items.length / lengthOffSet) + textMarginCount) * canvas.margin);
                margin.y = (canvas.playfield.y / 2) - (dimension.y / 2);

                p5.noStroke();
                p5.fill(40);
                p5.rect(
                    margin.x,
                    margin.y,
                    dimension.x,
                    dimension.y,
                    canvas.radius * 4
                );

                p5.textAlign(p5.CENTER, p5.CENTER)

                p5.fill(255);
                p5.stroke(0);
                p5.strokeWeight(3);
                p5.textSize(24)
                p5.text(
                    'Inventory',
                    canvas.playfield.x / 2,
                    margin.y + (textMarginCount * canvas.margin / 2)
                );

                let epicItems: Item[] = this.items.filter((item: Item) => item.rarity === 'Epic');
                let rareItems: Item[] = this.items.filter((item: Item) => item.rarity === 'Rare');
                let commonItems: Item[] = this.items.filter((item: Item) => item.rarity === 'Common');

                let sort: (a: Item, b: Item) => number = (a: Item, b: Item) => {
                    return a.name > b.name ? 1 : -1;
                };

                epicItems.sort(sort);
                rareItems.sort(sort);
                commonItems.sort(sort);

                this.items = epicItems.concat(rareItems.concat(commonItems));

                this.items.forEach((item: Item) => item.price = undefined)

                this.items.forEach((item: Item, index: number) => {
                    let cumulativeMarginX: number = margin.x + ((index % lengthOffSet) * (sideSize + canvas.margin)) + canvas.margin;
                    let cumulativeMarginY: number = margin.y + (Math.floor(index / lengthOffSet) * (sideSize + canvas.margin)) + (canvas.margin * textMarginCount);

                    drawItem(item, cumulativeMarginX, cumulativeMarginY, sideSize, sideSize, canvas)
                })

            }
        }
    }
}

export interface PlayerItemData extends IPlayerItemData {
    activeItem: Item;
    activeItemLimits: Limits;
    activeItem2: Item;
    activeItem2Limits: Limits;
    passiveLimits: Limits;
}