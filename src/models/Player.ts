import * as P5 from "p5";
import { checkPositionInLimit, drawItem, insertLineBreaks } from "../utils/Functions";
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
    hasItemThatPreventsFirstLethalDamage: boolean = false;
    hasUsedItemThatPreventsFirstLethalDamage: boolean = false;
    hpRegenFromItem: number = 0;
    damageMultiplier: number = 1;
    criticalMultiplier: number = 2;
    moveSaver: number = 0;
    gold: number = 0;

    hasInventoryOpen: boolean = false;
    activeItemLimits: number[];

    constructor(health: number, attack: number, defense: number, moves: number) {
        super();
        this.health = health;
        this.attack = attack;
        this.defense = defense;
        this.moves = moves;
        this.currentHealth = health;

        this.configureListeners();
    }

    configureListeners(): void {
        this.on('EventEmitter:KeyPressed', (event: KeyboardEvent, run: Run) => {
            if (event.key === 'Tab' && !run.hasDialogOpen) {
                this.hasInventoryOpen = true;
            }
        });

        this.on('EventEmitter:KeyReleased', (event: KeyboardEvent, run: Run) => {
            if (event.key === 'Tab') {
                this.hasInventoryOpen = false;
            }

            if (event.key === ' ') {
                this.useActiveItem(run);
            }
        });


        this.on('EventEmitter:MouseClicked:Click', (position: Position, run?: Run) => {
            setTimeout(() => {


                if (run.dialogController.currentDialog) {
                    return;
                }

                if (this.activeItem) {
                    if (checkPositionInLimit(position, ...this.activeItemLimits)) {
                        this.useActiveItem(run);
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

    hasItem(name: string): boolean {
        return this.items.map((item: Item) => item.name).includes(name);
    }

    heal(heal: number): void {
        if (this.currentHealth + heal > this.health) {
            heal = this.health - this.currentHealth;
        }

        this.currentHealth += heal;
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

        // active item slot

        let activeSlotX: number;
        let activeSlotY: number;

        if (canvas.horizontalLayout) {
            activeSlotX = canvas.margin * 1.5;
            activeSlotY = (canvas.canvasSize.y / 2) - (canvas.itemSideSize / 2);
        } else {
            activeSlotX = (canvas.canvasSize.x / 2) - (canvas.itemSideSize / 2);
            activeSlotY = canvas.topUiSize + canvas.margin * 1.5
        }

        this.activeItemLimits = [
            activeSlotX,
            activeSlotX + canvas.itemSideSize,
            activeSlotY,
            activeSlotY + canvas.itemSideSize
        ]

        let highlight: boolean = (checkPositionInLimit(new Position(p5.mouseX, p5.mouseY), ...this.activeItemLimits));

        p5.fill([...new Color(60, 60, 60).value, highlight ? 200 : 255]);

        (p5.drawingContext as CanvasRenderingContext2D).setLineDash([10, 10]);
        p5.rect(
            activeSlotX,
            activeSlotY,
            canvas.itemSideSize,
            canvas.itemSideSize,
            canvas.radius
        );
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
            let name: string = insertLineBreaks(this.activeItem.name, p5.map(canvas.itemSideSize - canvas.margin, 0, p5.textWidth(this.activeItem.name), 0, this.activeItem.name.length));
            if (canvas.horizontalLayout) {
                p5.fill(255);
                p5.stroke(0);
                p5.strokeWeight(3);
                p5.textSize(20)
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
                    'Space to Use',
                    activeSlotX + canvas.itemSideSize / 2,
                    activeSlotY + canvas.itemSideSize + - canvas.padding
                );
            } else {
                p5.fill(255);
                p5.stroke(0);
                p5.strokeWeight(3);
                p5.textSize(20)
                p5.text(
                    name,
                    canvas.canvasSize.x / 2,
                    activeSlotY + (canvas.itemSideSize / 2) - canvas.margin
                );

                p5.textAlign(p5.CENTER, p5.BOTTOM)
                p5.fill(200);
                p5.strokeWeight(2);
                p5.textSize(16)
                p5.text(
                    'Space to Use',
                    canvas.canvasSize.x / 2,
                    activeSlotY + canvas.itemSideSize + - canvas.padding

                );
            }
        }

        // buttons

        if (canvas.horizontalLayout) {

            let height: number = canvas.itemSideSize / 4;
            p5.noStroke()
            p5.fill(60);
            p5.rect(
                activeSlotX,
                activeSlotY + canvas.itemSideSize + (canvas.margin * 1.5),
                canvas.itemSideSize,
                height,
                canvas.radius
            );

            p5.textAlign(p5.CENTER, p5.CENTER)
            p5.fill(255);
            p5.stroke(0);
            p5.strokeWeight(3);
            p5.textSize(20)
            p5.text(
                'Inventory (Tab)',
                activeSlotX + (canvas.itemSideSize / 2),
                activeSlotY + canvas.itemSideSize + (canvas.margin * 1.5) + height / 2,
            );

            p5.noStroke()
            p5.fill(60);
            p5.rect(
                activeSlotX,
                activeSlotY + canvas.itemSideSize + height + (canvas.margin * 3),
                canvas.itemSideSize,
                height,
                canvas.radius
            );

            p5.textAlign(p5.LEFT, p5.CENTER)
            p5.fill(...Color.YELLOW.value, 255);
            p5.stroke(0);
            p5.strokeWeight(3);
            p5.textSize(20)
            p5.text(
                'Gold',
                activeSlotX + canvas.padding,
                activeSlotY + canvas.itemSideSize + (canvas.margin * 3) + (height * 1.5)
            );

            p5.textAlign(p5.RIGHT, p5.CENTER)
            p5.fill(...Color.YELLOW.value, 255);
            p5.textSize(20)
            p5.text(
                `$ ${this.gold}`,
                activeSlotX + canvas.itemSideSize - canvas.padding,
                activeSlotY + canvas.itemSideSize + (canvas.margin * 3) + (height * 1.5)
            );
        }

        if (this.hasInventoryOpen && this.items.length) {

            let sideSize: number = canvas.itemSideSize / Math.ceil(this.items.length / 20);
            let dimension: Position = new Position(0, 0);
            let margin: Position = new Position(0, 0);

            let textMarginCount: number = 3;
            let lengthOffSet: number = 4 + Math.ceil(this.items.length / 20);
            let maxLength: number = this.items.length > lengthOffSet ? lengthOffSet : this.items.length

            console.log(this.items.length)

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

            this.items.forEach((item: Item, index: number) => {
                let cumulativeMarginX: number = margin.x + ((index % lengthOffSet) * (sideSize + canvas.margin)) + canvas.margin;
                let cumulativeMarginY: number = margin.y + (Math.floor(index / lengthOffSet) * (sideSize + canvas.margin)) + (canvas.margin * textMarginCount);

                drawItem(item, cumulativeMarginX, cumulativeMarginY, sideSize, canvas)
            })

        }
    }
}

export interface DamageData {
    damage: number;
    shielded: boolean;
}