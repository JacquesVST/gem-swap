import * as P5 from "p5";
import { Canvas } from "../controllers/Canvas";
import { DialogController } from "../controllers/DialogController";
import { EventEmitter } from "../controllers/EventEmitter";
import { Frequency, IDamageBoostTimerData, IDamageData, IPlayer, IPlayerItemData } from "../interfaces";
import { drawItem, endShadow, fillFlat, fillStroke, rectWithStripes, startShadow } from "../utils/Draw";
import { formatNumber, formatTimer, insertLineBreaks } from "../utils/General";
import { getXP, setXP } from "../utils/LocalStorage";
import { Color } from "./Color";
import { Enemy } from "./Enemy";
import { Item } from "./Item";
import { Limits } from "./Limits";
import { Piece } from "./Piece";
import { Position } from "./Position";
import { Run } from "./Run";
import { Shape } from "./Shape";

export class Player extends EventEmitter implements IPlayer {
    health: number;
    maxHealth: number;
    moves: number;
    maxMoves: number;
    attack: number;
    defense: number;

    damageMultiplier: number = 1;
    criticalMultiplier: number = 1.75;
    critical: number = 1;
    gold: number = 0;
    xp: number;

    hasInventoryOpen: boolean = false;
    hasStatsOpen: boolean = false;
    hasPassiveDetailsOpen: boolean = false;

    passive: Item;
    items: Item[] = [];

    itemData: PlayerItemData = {
        activeItem: undefined,
        activeItem2: undefined,
        activeItem2Limits: undefined,
        activeItemLimits: undefined,
        bonusMoves: 0,
        bossCrits: 0,
        bossMoves: 0,
        criticalChance: 0,
        diagonals: false,
        goldAddCount: 0,
        hasShield: false,
        hasUsedShield: false,
        moveSaverChance: 0,
        omniMoves: 0,
        passiveLimits: undefined,
        reach: 1,
        rerolls: 0,
        colorDamageBosts: {},
        damageBoostTimer: {
            timer: 0,
            multiplier: 1,
            label: '0.00 (X0.5)',
            hasMoved: false,
            color: Color.WHITE_1,
            interval: undefined
        },
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

        this.xp = getXP();

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
                this.damageMultiplier = 4;
                break;
            case 'Flexible':
                this.itemData.diagonals = true;
                break;
            case 'Gambler':
                this.itemData.rerolls = 1
                break;
            case 'No barriers':
                this.itemData.reach = 2;
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

            if (this.hasInventoryOpen && event.key === 'Escape') {
                this.hasInventoryOpen = false;
            }

            if ((event.key === 's' || event.key === 'S')) {
                this.hasStatsOpen = !this.hasStatsOpen;
            }

            if ((event.key === 'p' || event.key === 'P') && !run.hasDialogOpen && !this.hasStatsOpen) {
                this.hasPassiveDetailsOpen = !this.hasPassiveDetailsOpen;
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

                if (this.passive) {
                    if (this.itemData.passiveLimits.contains(position) && !this.hasStatsOpen) {
                        this.hasPassiveDetailsOpen = !this.hasPassiveDetailsOpen;
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
        });

        this.on('Map:NextStageReached', () => {
            setXP(this.xp);
        });

        this.on('Map:NextFloorReached', () => {
            setXP(this.xp);
        });

        this.on('Enemy:EnemyDied', (enemy: Enemy) => {
            this.xp += enemy.attack;
        });

        this.on('Grid:OmniMoveDone', () => {
            this.itemData.omniMoves--;
        });

        this.on('Run:MidasTouched', (gold: number) => {
            this.addGold(gold)
        });

        this.on('Grid:FairTrade', () => {
            this.heal(this.maxHealth * 0.01);
        });

        this.on('Grid:AnotherFairTrade', (choice: boolean) => {
            if (choice) {
                this.damage({ damage: this.maxHealth * 0.01, shielded: false })
            } else {
                this.updateMoves(this.moves + 2);
            }
        });
    }

    get movesEnded(): boolean {
        return this.moves === 0;
    }

    useActiveItem(run: Run): void {
        if (this.itemData.activeItem && !this.itemData.activeItem.disabled && !run.hasDialogOpen) {
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
        if (this.hasItem('Extra Active Item') && this.itemData.activeItem2 && !this.itemData.activeItem2.disabled && !run.hasDialogOpen) {
            this.itemData.activeItem2.effect();
            if (this.itemData.activeItem2.frequency === Frequency.SINGLE_USE) {
                this.itemData.activeItem2 = undefined;
            } else {
                this.itemData.activeItem2.disabled = true
            }
            run.sounds['item'].play();
        }
    }

    clearTimer(): void {
        this.itemData.damageBoostTimer = {
            timer: 0,
            multiplier: 1,
            label: '0.00 (X0.75)',
            hasMoved: false,
            color: Color.WHITE_1,
            interval: undefined
        }
    }

    incrementTimer(matches: Piece[][], run: Run): void {

        if (this.passive?.name === 'Think Fast') {
            let timeToAdd: number = 0;
            matches.forEach((match: Piece[]) => {
                switch (match.length) {
                    case 0:
                    case 1:
                    case 2:
                        timeToAdd += 0;
                        break;
                    case 3:
                        timeToAdd += 1.5;
                        break;
                    case 4:
                        timeToAdd += 3;
                        break;
                    case 5:
                        timeToAdd += 5;
                        break;
                    default:
                        timeToAdd += 7.5;
                        break;
                }
            });

            this.itemData.damageBoostTimer.timer += timeToAdd * 1000;

            if (this.timeLeft > 40000) {
                this.itemData.damageBoostTimer.timer = 40000;
            } 
            const updateInterval: number = 10;
            if (!this.itemData.damageBoostTimer.interval) {
                this.itemData.damageBoostTimer.interval = setInterval(() => {
                    let multiplier: number = 0.5;
                    let color: Color = Color.WHITE_1;
                    if (this.timeLeft > 0) {
                        if (this.timeLeft > 30000) {
                            multiplier = 5;
                            color = Color.GREEN;
                        } else if (this.timeLeft > 18000) {
                            multiplier = 4;
                            color = Color.YELLOW;
                        } else if (this.timeLeft > 9000) {
                            multiplier = 3;
                            color = Color.YELLOW;
                        } else if (this.timeLeft > 3000) {
                            multiplier = 2;
                            color = Color.ORANGE;
                        } else {
                            multiplier = 1;
                            color = Color.WHITE;
                        }
                        if (!run.hasDialogOpen && !run.inAnimation) {
                            this.itemData.damageBoostTimer.timer -= updateInterval;
                        }
                    } else {
                        clearInterval(this.itemData.damageBoostTimer.interval);
                        this.itemData.damageBoostTimer.interval = undefined;
                    }
                    this.itemData.damageBoostTimer.multiplier = multiplier;
                    this.itemData.damageBoostTimer.color = color;
                    this.itemData.damageBoostTimer.label = formatTimer(this.timeLeft, multiplier);
                }, updateInterval)
            }
        }

    }

    get timeLeft(): number {
        return this.itemData.damageBoostTimer.timer;
    }

    hasItem(name: string): boolean {
        return this.items.map((item: Item) => item.name).includes(name);
    }

    heal(heal: number): void {
        if (this.health + heal > this.maxHealth) {
            heal = this.maxHealth - this.health;
        }

        this.health += heal;
        this.emit('Healed', heal);
    }

    addGold(gold: number): void {
        if (gold !== 0) {
            gold = Math.floor(gold);
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
        const canvas: Canvas = Canvas.getInstance();
        const p5: P5 = canvas.p5;
        const drawingContext: CanvasRenderingContext2D = p5.drawingContext as CanvasRenderingContext2D;

        const rectLeft: number = canvas.margin * 2;
        const rectRight: number = canvas.gridData.marginLeft - canvas.margin;
        const referenceY: number = canvas.windowSize.y / 2;

        const itemLeft: number = ((canvas.gridData.marginLeft - canvas.margin) / 2) + canvas.margin - canvas.itemSideSize / 2

        if (!this.hasStatsOpen) {

            const compactItemSideSize: number = canvas.itemSideSize / 6 * 4;

            const activeSlotX: number = itemLeft
            const activeSlotY: number = (canvas.windowSize.y / 2) - (canvas.itemSideSize / 2);

            const activeSlotX2: number = itemLeft + canvas.itemSideSize / 6;
            const activeSlotY2: number = activeSlotY - canvas.margin - (canvas.itemSideSize / 6 * 4)

            const passiveSlotX: number = itemLeft + canvas.itemSideSize / 6;
            const passiveSlotY: number = activeSlotY + canvas.itemSideSize + canvas.margin;

            this.itemData.activeItemLimits = Position.of(activeSlotX, activeSlotY).toLimits(Position.of(canvas.itemSideSize, canvas.itemSideSize));
            this.itemData.activeItem2Limits = Position.of(activeSlotX2, activeSlotY2).toLimits(Position.of(compactItemSideSize, compactItemSideSize));
            this.itemData.passiveLimits = Position.of(passiveSlotX, passiveSlotY).toLimits(Position.of(compactItemSideSize, compactItemSideSize));

            const opacity1: number = this.itemData.activeItemLimits.contains(canvas.mousePosition) ? 200 : 255;
            const opacity2: number = this.itemData.activeItem2Limits.contains(canvas.mousePosition) ? 200 : 255;
            const opacity3: number = this.itemData.passiveLimits.contains(canvas.mousePosition) ? 200 : 255;

            drawingContext.setLineDash([10, 10])
            startShadow(drawingContext);

            p5.fill(Color.GRAY_3.alpha(opacity1).value);
            p5.rect(
                activeSlotX,
                activeSlotY,
                canvas.itemSideSize,
                canvas.itemSideSize,
                canvas.radius
            );

            p5.fill(Color.GRAY_3.alpha(opacity3).value);
            p5.rect(
                passiveSlotX,
                passiveSlotY,
                compactItemSideSize,
                compactItemSideSize,
                canvas.radius
            );

            if (this.hasItem('Extra Active Item')) {
                p5.fill(Color.GRAY_3.alpha(opacity2).value);
                p5.rect(
                    activeSlotX2,
                    activeSlotY2,
                    compactItemSideSize,
                    compactItemSideSize,
                    canvas.radius
                );
            }

            drawingContext.setLineDash([])
            endShadow(drawingContext);

            // slot 1
            if (this.itemData.activeItem) {
                const color: Color = this.itemData.activeItem.disabled ? Color.GRAY_3 : Item.rarityColors[this.itemData.activeItem.rarity].color.alpha(opacity1);

                startShadow(drawingContext);
                fillFlat(color)
                p5.rect(
                    activeSlotX,
                    activeSlotY,
                    canvas.itemSideSize,
                    canvas.itemSideSize,
                    canvas.radius
                );
                endShadow(drawingContext)

                p5.textAlign(p5.CENTER, p5.CENTER)
                p5.textSize(canvas.uiData.fontText)
                let name: string = insertLineBreaks(this.itemData.activeItem.name, p5.map(canvas.itemSideSize - canvas.margin, 0, p5.textWidth(this.itemData.activeItem.name), 0, this.itemData.activeItem.name.length));

                fillStroke();
                p5.text(
                    name,
                    activeSlotX + canvas.itemSideSize / 2,
                    canvas.windowSize.y / 2,
                );

                p5.textAlign(p5.CENTER, p5.BOTTOM)
                fillStroke(Color.WHITE_1)
                p5.textSize(canvas.uiData.fontSubText)
                p5.text(
                    'Space',
                    activeSlotX + canvas.itemSideSize / 2,
                    activeSlotY + canvas.itemSideSize + - canvas.padding
                );

            }

            // slot 2
            if (this.hasItem('Extra Active Item') && this.itemData.activeItem2) {
                const color: Color = this.itemData.activeItem2.disabled ? Color.GRAY_3 : Item.rarityColors[this.itemData.activeItem2.rarity].color.alpha(opacity2);

                startShadow(drawingContext);
                p5.fill(color.value);
                p5.rect(
                    activeSlotX2,
                    activeSlotY2,
                    compactItemSideSize,
                    compactItemSideSize,
                    canvas.radius
                );
                endShadow(drawingContext);

                p5.textAlign(p5.CENTER, p5.CENTER);
                p5.textSize(canvas.uiData.fontSubText);
                let name: string = insertLineBreaks(this.itemData.activeItem2.name, p5.map(canvas.itemSideSize - canvas.margin, 0, p5.textWidth(this.itemData.activeItem2.name), 0, this.itemData.activeItem2.name.length));

                fillStroke();
                p5.text(
                    name,
                    activeSlotX2 + compactItemSideSize / 2,
                    activeSlotY2 + compactItemSideSize / 2,
                );

                p5.textAlign(p5.CENTER, p5.BOTTOM);
                fillStroke(Color.WHITE_1);
                p5.textSize(canvas.uiData.fontDetail);
                p5.text(
                    'Enter',
                    activeSlotX2 + compactItemSideSize / 2,
                    activeSlotY2 + compactItemSideSize - canvas.padding
                );

            }

            //passive
            if (this.passive) {
                const color: Color = this.passive.disabled ? Color.GRAY_3 : Item.rarityColors[this.passive?.rarity].color.alpha(opacity3);

                startShadow(drawingContext)
                fillFlat(color);
                p5.rect(
                    passiveSlotX,
                    passiveSlotY,
                    compactItemSideSize,
                    compactItemSideSize,
                    canvas.radius
                );
                endShadow(drawingContext)

                p5.textAlign(p5.CENTER, p5.CENTER);
                p5.textSize(canvas.uiData.fontSubText);

                let name: string = insertLineBreaks(this.passive.name, p5.map(canvas.itemSideSize - canvas.margin, 0, p5.textWidth(this.passive.name), 0, this.passive.name.length));

                fillStroke();
                p5.text(
                    name,
                    passiveSlotX + compactItemSideSize / 2,
                    passiveSlotY + compactItemSideSize / 2,
                );

                p5.textAlign(p5.CENTER, p5.BOTTOM)
                fillStroke(Color.WHITE_1);
                p5.textSize(canvas.uiData.fontDetail)
                p5.text(
                    'Passive',
                    passiveSlotX + compactItemSideSize / 2,
                    passiveSlotY + compactItemSideSize - canvas.padding
                );

                if (this.passive.name === 'Think Fast') {

                    startShadow(drawingContext)
                    fillFlat(Color.GRAY_3);
                    p5.rect(
                        passiveSlotX,
                        passiveSlotY + compactItemSideSize + canvas.margin,
                        compactItemSideSize,
                        canvas.itemSideSize / 4,
                        canvas.radius
                    );
                    endShadow(drawingContext)

                    const timerColor: Color = this.itemData.damageBoostTimer.color;

                    fillStroke(timerColor);
                    p5.textAlign(p5.CENTER, p5.CENTER)
                    p5.textSize(canvas.uiData.fontText);
                    p5.text(
                        this.itemData.damageBoostTimer.label,
                        passiveSlotX + compactItemSideSize / 2,
                        passiveSlotY + compactItemSideSize + canvas.margin + canvas.itemSideSize / 8
                    );
                }

            }
        }

        if (this.hasStatsOpen) {

            const textLeft = rectLeft + canvas.padding;
            const textRight = rectRight - canvas.padding;

            const width: number = rectRight - rectLeft;
            const height: number = canvas.itemSideSize / 4;

            const statsData: StatData[] = [
                {
                    label: 'Attack',
                    value: `${formatNumber(this.attack)}`
                },
                {
                    label: 'Defense',
                    value: `${formatNumber(this.defense)}`
                },
                {
                    label: 'Crit Count',
                    value: `${formatNumber(this.critical)}`
                },
                {
                    label: 'Crit Damage',
                    value: `${Math.floor((this.criticalMultiplier - 1) * 100)}%`,
                },
                {
                    label: 'Multiplier',
                    value: `${Math.floor((this.damageMultiplier) * 100)}%`,
                },
                {
                    label: 'XP',
                    value: `${Math.floor(this.xp)}`
                }
            ]

            if (this.itemData?.criticalChance > 0) {
                statsData.push({
                    label: 'Crit Chance',
                    value: `${Math.floor((this.itemData.criticalChance) * 100)}%`,
                })
            }

            if (this.itemData?.reach > 1) {
                statsData.push({
                    label: 'Reach',
                    value: `${Math.floor(this.itemData.reach)}`
                })
            }

            if (this.itemData.moveSaverChance) {
                statsData.push({
                    label: 'Move Spare Chance',
                    value: `${Math.floor((this.itemData.moveSaverChance) * 100)}%`,
                })
            }

            if (this.itemData.rerolls) {
                statsData.push({
                    label: 'Rerolls Left',
                    value: `${Math.floor(this.itemData.rerolls)}`,
                })
            }

            if (this.items.some((item: Item) => item.name.endsWith('Color Boost'))) {
                this.items.filter((item: Item) => item.name.endsWith('Color Boost')).forEach((item: Item) => {
                    if (!statsData.map((statData: StatData) => statData.label).includes(item.name)) {

                        statsData.push({
                            label: item.name,
                            value: `+${Math.floor(this.itemData.colorDamageBosts[item.name.split(' ')[0].toLowerCase()].itemData.bonusDamage)}`,
                        })
                    }
                })

            }

            startShadow(drawingContext);
            rectWithStripes(
                Position.of(rectLeft, referenceY - (height * (statsData.length / 2))),
                Position.of(width, height * statsData.length),
                statsData.length,
                true,
                Color.GRAY_3,
                Color.GRAY_2
            );
            endShadow(drawingContext);

            const referenceIndex: number = statsData.length / 2;
            statsData.forEach((stat: StatData, index) => {
                const offset: number = index - referenceIndex + 0.5;

                fillStroke(Color.WHITE_1)
                p5.textAlign(p5.LEFT, p5.CENTER)
                p5.textSize(canvas.uiData.fontSubText)
                p5.text(
                    stat.label,
                    textLeft,
                    referenceY + height * offset
                );

                fillStroke()
                p5.textAlign(p5.RIGHT, p5.CENTER)
                p5.textSize(canvas.uiData.fontText)
                p5.text(
                    stat.value,
                    textRight,
                    referenceY + height * offset
                );

            });
        }

        if (this.hasInventoryOpen && this.items.length) {

            fillFlat(Color.DIM);
            p5.rect(
                0,
                0,
                canvas.windowSize.x,
                canvas.windowSize.y,
            );

            let sideSize: number = canvas.itemSideSize;
            let dimension: Position = Position.of(0, 0);
            let margin: Position = Position.of(0, 0);

            let textMarginCount: number = 3;
            let lengthOffSet: number = 4 + Math.ceil(this.items.length / 10);
            let maxLength: number = this.items.length > lengthOffSet ? lengthOffSet : this.items.length

            dimension.x = maxLength * sideSize + ((maxLength + 1) * canvas.margin);
            margin.x = (canvas.playfield.x / 2) - (dimension.x / 2);

            dimension.y = (Math.ceil(this.items.length / lengthOffSet) * sideSize) + ((Math.ceil(this.items.length / lengthOffSet) + textMarginCount) * canvas.margin);
            margin.y = (canvas.playfield.y / 2) - (dimension.y / 2);

            startShadow(drawingContext);
            fillFlat(Color.GRAY_2);
            p5.rect(
                margin.x,
                margin.y,
                dimension.x,
                dimension.y,
                canvas.radius * 4
            );
            endShadow(drawingContext);

            p5.textAlign(p5.CENTER, p5.CENTER)

            p5.fill(255);
            p5.stroke(0);
            p5.strokeWeight(canvas.stroke);
            p5.textSize(canvas.uiData.fontTitle)
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

                drawItem(item, Position.of(cumulativeMarginX, cumulativeMarginY), Position.of(sideSize, sideSize))
            })

        }

        this.drawPassiveDetail();
    }

    drawPassiveDetail() {
        const canvas: Canvas = Canvas.getInstance();
        const p5: P5 = canvas.p5;

        if (this.hasPassiveDetailsOpen && this.passive) {

            const slotX: number = ((canvas.gridData.marginLeft - canvas.margin) / 2) + canvas.margin - canvas.itemSideSize / 2
            const slotY: number = (canvas.windowSize.y / 2) - (canvas.itemSideSize / 2) + canvas.itemSideSize + (canvas.margin * 2) + canvas.itemSideSize / 6 * 4;

            fillFlat(Color.GRAY_3.alpha(200));
            p5.rect(
                slotX,
                slotY,
                canvas.itemSideSize,
                canvas.itemSideSize / 3,
                canvas.radius
            );

            p5.triangle(
                slotX + canvas.itemSideSize / 2 - canvas.margin,
                slotY,
                slotX + canvas.itemSideSize / 2 + canvas.margin,
                slotY,
                slotX + canvas.itemSideSize / 2,
                slotY - canvas.margin,
            );

            p5.textAlign(p5.CENTER, p5.CENTER)
            p5.textSize(canvas.uiData.fontDetail);
            let description: string = insertLineBreaks(this.passive.description, p5.map(canvas.itemSideSize - canvas.margin, 0, p5.textWidth(this.passive.description), 0, this.passive.description.length));

            fillStroke(Color.WHITE_1)
            p5.text(
                description,
                slotX + canvas.itemSideSize / 2,
                slotY + canvas.itemSideSize / 6
            );
        }
    }
}

export interface PlayerItemData extends IPlayerItemData {
    activeItem: Item;
    activeItemLimits: Limits;
    activeItem2: Item;
    activeItem2Limits: Limits;
    passiveLimits: Limits;
    colorDamageBosts: { [key: string]: Shape }
    damageBoostTimer: DamageBoostTimerData
}

export interface DamageBoostTimerData extends IDamageBoostTimerData {
    color: Color;
}

export interface StatData {
    label: string,
    value: string
}