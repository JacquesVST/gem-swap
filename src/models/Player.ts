import * as P5 from "p5";
import { checkPositionInLimit, drawItem, formatNumber, insertLineBreaks } from "../utils/Functions";
import { CanvasInfo } from "./CanvasInfo";
import { Color } from "./Color";
import { ConfigureListeners, EventEmitter } from "./EventEmitter";
import { Item } from "./Item";
import { Position } from "./Position";
import { Run } from "./Run";

export class Player extends EventEmitter implements ConfigureListeners {
    health: number;
    attack: number;
    defense: number;
    moves: number;
    currentHealth: number;

    critical: number = 1;
    bossCritical: number = 0;

    items: Item[] = [];
    activeItem: Item;
    activeItem2: Item;
    hasItemThatPreventsFirstLethalDamage: boolean = false;
    hasUsedItemThatPreventsFirstLethalDamage: boolean = false;
    damageMultiplier: number = 1;
    criticalMultiplier: number = 1.5;
    moveSaver: number = 0;
    gold: number = 0;
    xp: number = 0;
    reach: number = 1;

    hasInventoryOpen: boolean = false;
    hasStatsOpen: boolean = true;
    activeItemLimits: number[];
    activeItem2Limits: number[];

    constructor(health: number, attack: number, defense: number, moves: number) {
        super('Player');
        this.health = health;
        this.attack = attack;
        this.defense = defense;
        this.moves = moves;
        this.currentHealth = health;

        this.configureListeners();
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
                if (run.dialogController.currentDialog) {
                    return;
                }

                if (this.activeItem && this.activeItemLimits) {
                    if (checkPositionInLimit(position, ...this.activeItemLimits)) {
                        this.useActiveItem(run);
                    }
                }

                if (this.activeItem2 && this.activeItem2Limits) {
                    if (checkPositionInLimit(position, ...this.activeItem2Limits)) {
                        this.useActiveItem2(run);
                    }
                }
            }, 0);
        });
    }

    static defaultPlayer(): Player {
        return new Player(100, 100, 0, 0);
    }

    get movesEnded(): boolean {
        return this.moves === 0;
    }

    useActiveItem(run: Run): void {
        if (this.activeItem) {
            this.activeItem.effect();
            this.activeItem = undefined;
            run.sounds['item'].play();
        }
    }

    useActiveItem2(run: Run): void {
        if (this.activeItem2 && 'Extra Active Item') {
            this.activeItem2.effect();
            this.activeItem2 = undefined;
            run.sounds['item'].play();
        }
    }


    hasItem(name: string): boolean {
        return this.items.map((item: Item) => item.name).includes(name);
    }

    heal(heal: number): void {
        if (this.currentHealth + heal > this.health) {
            heal = this.health - this.currentHealth;
        }

        this.currentHealth += heal;
    }

    addGold(gold: number): void {
        if (gold !== 0) {
            this.gold = Math.floor(this.gold + gold);
            this.emit('AddedGold', gold)
        }
    }

    simulateDamage(damage: number): DamageData {
        if (!damage || !parseInt(damage + '', 10)) {
            damage = 0;
        }

        let shielded = false;
        damage = (damage - this.defense < 0) ? 0 : (damage - this.defense);

        if (this.hasItemThatPreventsFirstLethalDamage && !this.hasUsedItemThatPreventsFirstLethalDamage) {
            if (damage >= this.currentHealth) {
                damage = 0;
                this.hasUsedItemThatPreventsFirstLethalDamage = true;
                this.items = this.items.filter((item: Item) => item.name !== 'Shield');
                shielded = true
            }
        } else {
            if (damage > this.currentHealth) {
                damage = this.currentHealth
            }
        }

        return { damage, shielded };
    }

    damage(damage: DamageData): void {
        this.currentHealth -= damage.damage;

        this.emit('PlayerDamaged', this);

        if (this.currentHealth <= 0) {
            this.emit('PlayerDied');
        }
    }

    updateMoves(newMoves: number): void {
        this.moves = newMoves;

        this.emit('MovesUpdated', this)
    }

    draw(canvas: CanvasInfo): void {
        const p5: P5 = canvas.p5;

        let itemMarginX: number = canvas.margin + ((canvas.margin * 1.5 + canvas.itemSideSize + canvas.gridInfo.horizontalCenterPadding / 2 - canvas.padding) / 2) - (canvas.itemSideSize / 2);

        if (canvas.horizontalLayout) {
            // active item slot
            if (!this.hasStatsOpen) {

                let activeSlotX: number = itemMarginX
                let activeSlotX2: number = itemMarginX + canvas.itemSideSize / 4;
                let activeSlotY: number = (canvas.canvasSize.y / 2) - (canvas.itemSideSize / 2);
                let activeSlotY2: number = activeSlotY - canvas.margin * 1.5 - canvas.itemSideSize / 2

                this.activeItemLimits = [
                    activeSlotX,
                    activeSlotX + canvas.itemSideSize,
                    activeSlotY,
                    activeSlotY + canvas.itemSideSize
                ];

                this.activeItem2Limits = [
                    activeSlotX,
                    activeSlotX2 + canvas.itemSideSize / 2,
                    activeSlotY2,
                    activeSlotY2 + canvas.itemSideSize / 2
                ];

                let highlight: boolean = (checkPositionInLimit(new Position(p5.mouseX, p5.mouseY), ...this.activeItemLimits));
                let highlight2: boolean = (checkPositionInLimit(new Position(p5.mouseX, p5.mouseY), ...this.activeItem2Limits));


                (p5.drawingContext as CanvasRenderingContext2D).setLineDash([10, 10]);
                p5.fill([...new Color(60, 60, 60).value, highlight ? 200 : 255]);
                p5.rect(
                    activeSlotX,
                    activeSlotY,
                    canvas.itemSideSize,
                    canvas.itemSideSize,
                    canvas.radius
                );

                if (this.hasItem('Extra Active Item')) {

                    p5.fill([...new Color(60, 60, 60).value, highlight2 ? 200 : 255]);
                    p5.rect(
                        activeSlotX2,
                        activeSlotY2,
                        canvas.itemSideSize / 2,
                        canvas.itemSideSize / 2,
                        canvas.radius
                    );
                }
                (p5.drawingContext as CanvasRenderingContext2D).setLineDash([]);



                if (this.activeItem) {
                    p5.fill([...Item.rarityColors()[this.activeItem.rarity].color.value, highlight ? 200 : 255]);
                    p5.rect(
                        activeSlotX,
                        activeSlotY,
                        canvas.itemSideSize,
                        canvas.itemSideSize,
                        canvas.radius
                    );

                    p5.textAlign(p5.CENTER, p5.CENTER)
                    p5.textSize(20)
                    let name: string = insertLineBreaks(this.activeItem.name, p5.map(canvas.itemSideSize - canvas.margin, 0, p5.textWidth(this.activeItem.name), 0, this.activeItem.name.length));

                    p5.fill(255);
                    p5.stroke(0);
                    p5.strokeWeight(3);
                    p5.text(
                        name,
                        activeSlotX + canvas.itemSideSize / 2,
                        canvas.canvasSize.y / 2,
                    );

                    p5.textAlign(p5.CENTER, p5.BOTTOM)
                    p5.fill(200);
                    p5.strokeWeight(2);
                    p5.textSize(16)
                    p5.text(
                        'Space',
                        activeSlotX + canvas.itemSideSize / 2,
                        activeSlotY + canvas.itemSideSize + - canvas.padding
                    );

                }

                if (this.hasItem('Extra Active Item') && this.activeItem2) {

                    p5.fill([...Item.rarityColors()[this.activeItem2.rarity].color.value, highlight2 ? 200 : 255]);
                    p5.rect(
                        activeSlotX2,
                        activeSlotY2,
                        canvas.itemSideSize / 2,
                        canvas.itemSideSize / 2,
                        canvas.radius
                    );

                    p5.textAlign(p5.CENTER, p5.CENTER)
                    p5.textSize(20)
                    let name: string = insertLineBreaks(this.activeItem2.name, p5.map(canvas.itemSideSize - canvas.margin, 0, p5.textWidth(this.activeItem2.name), 0, this.activeItem2.name.length));

                    p5.fill(255);
                    p5.stroke(0);
                    p5.strokeWeight(3);
                    p5.text(
                        name,
                        activeSlotX2 + canvas.itemSideSize / 4,
                        activeSlotY2 + canvas.itemSideSize / 4,
                    );

                    p5.textAlign(p5.CENTER, p5.BOTTOM)
                    p5.fill(200);
                    p5.strokeWeight(2);
                    p5.textSize(16)
                    p5.text(
                        'Enter',
                        activeSlotX2 + canvas.itemSideSize / 4,
                        activeSlotY2 + canvas.itemSideSize / 2 - canvas.padding
                    );

                }
            }

            if (this.hasStatsOpen) {
                let height: number = canvas.itemSideSize / 4;
                let marginY: number = canvas.margin + canvas.topUiSize + (canvas.gridInfo.totalGridHeight / 2);
                let marginX: number = itemMarginX + canvas.padding;


                p5.noStroke()
                p5.fill(60);
                p5.rect(
                    itemMarginX,
                    marginY - (height * 3.5),
                    canvas.itemSideSize,
                    height * 7,
                    canvas.radius
                );

                // gold
                p5.textAlign(p5.LEFT, p5.CENTER)
                p5.fill(...Color.YELLOW.value, 255);
                p5.stroke(0);
                p5.strokeWeight(3);
                p5.textSize(16)
                p5.text(
                    'Gold',
                    marginX,
                    marginY - height * 3
                );

                p5.textAlign(p5.RIGHT, p5.CENTER)
                p5.fill(...Color.YELLOW.value, 255);
                p5.textSize(20)
                p5.text(
                    `$ ${this.gold}`,
                    marginX + canvas.itemSideSize - canvas.padding * 2,
                    marginY - height * 3
                );

                // attack
                p5.textAlign(p5.LEFT, p5.CENTER)
                p5.fill(255);
                p5.stroke(0);
                p5.strokeWeight(3);
                p5.textSize(16)
                p5.text(
                    'Attack',
                    marginX,
                    marginY - height * 2
                );

                p5.textAlign(p5.RIGHT, p5.CENTER)
                p5.fill(255);
                p5.textSize(20)
                p5.text(
                    `${formatNumber(this.attack)}`,
                    marginX + canvas.itemSideSize - canvas.padding * 2,
                    marginY - height * 2
                );

                // defense
                p5.textAlign(p5.LEFT, p5.CENTER)
                p5.fill(255);
                p5.stroke(0);
                p5.strokeWeight(3);
                p5.textSize(16)
                p5.text(
                    'Defense',
                    marginX,
                    marginY - height
                );

                p5.textAlign(p5.RIGHT, p5.CENTER)
                p5.fill(255);
                p5.textSize(20)
                p5.text(
                    `${formatNumber(this.defense)}`,
                    marginX + canvas.itemSideSize - canvas.padding * 2,
                    marginY - height
                );

                // crit count
                p5.textAlign(p5.LEFT, p5.CENTER)
                p5.fill(255);
                p5.stroke(0);
                p5.strokeWeight(3);
                p5.textSize(16)
                p5.text(
                    'Crit Count',
                    marginX,
                    marginY
                );

                p5.textAlign(p5.RIGHT, p5.CENTER)
                p5.fill(255);
                p5.textSize(20)
                p5.text(
                    `${formatNumber(this.critical)}`,
                    marginX + canvas.itemSideSize - canvas.padding * 2,
                    marginY
                );

                // crit damage
                p5.textAlign(p5.LEFT, p5.CENTER)
                p5.fill(255);
                p5.stroke(0);
                p5.strokeWeight(3);
                p5.textSize(16)
                p5.text(
                    'Crit Damage',
                    marginX,
                    marginY + height
                );

                p5.textAlign(p5.RIGHT, p5.CENTER)
                p5.fill(255);
                p5.textSize(20)
                p5.text(
                    `${Math.floor((this.criticalMultiplier - 1) * 100)}%`,
                    marginX + canvas.itemSideSize - canvas.padding * 2,
                    marginY + height
                );

                // damage multiplier
                p5.textAlign(p5.LEFT, p5.CENTER)
                p5.fill(255);
                p5.stroke(0);
                p5.strokeWeight(3);
                p5.textSize(16)
                p5.text(
                    'Multiplier',
                    marginX,
                    marginY + height * 2
                );

                p5.textAlign(p5.RIGHT, p5.CENTER)
                p5.fill(255);
                p5.textSize(20)
                p5.text(
                    `${Math.floor((this.damageMultiplier) * 100)}%`,
                    marginX + canvas.itemSideSize - canvas.padding * 2,
                    marginY + height * 2
                );

                // xp
                p5.textAlign(p5.LEFT, p5.CENTER)
                p5.fill(255);
                p5.stroke(0);
                p5.strokeWeight(3);
                p5.textSize(16)
                p5.text(
                    'XP',
                    marginX,
                    marginY + height * 3
                );

                p5.textAlign(p5.RIGHT, p5.CENTER)
                p5.fill(255);
                p5.textSize(20)
                p5.text(
                    `${Math.floor(this.xp)}`,
                    marginX + canvas.itemSideSize - canvas.padding * 2,
                    marginY + height * 3
                );

                if (this.hasInventoryOpen && this.items.length) {

                    p5.noStroke();
                    p5.fill(50, 50, 50, 100);
                    p5.rect(
                        0,
                        0,
                        canvas.canvasSize.x,
                        canvas.canvasSize.y,
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

                        drawItem(item, cumulativeMarginX, cumulativeMarginY, sideSize, canvas)
                    })

                }
            }
        }
    }
}

export interface DamageData {
    damage: number;
    shielded: boolean;
}