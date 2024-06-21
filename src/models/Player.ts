import * as P5 from "p5";
import { Canvas } from "../controllers/Canvas";
import { DialogController } from "../controllers/DialogController";
import { EventEmitter } from "../controllers/EventEmitter";
import { TextController } from "../controllers/TextController";
import { Difficulty, Frequency, IDamageBoostTimerData, IDamageData, IPlayer, IPlayerItemData, IStat } from "../interfaces";
import { drawItem, endShadow, fillFlat, fillStroke, rectWithStripes, startShadow } from "../utils/Draw";
import { formatNumber, formatTimer, insertLineBreaks } from "../utils/General";
import { getXP, setXP } from "../utils/LocalStorage";
import { Color } from "./Color";
import { Enemy } from "./Enemy";
import { Item } from "./Item";
import { Limits } from "./Limits";
import { Piece } from "./Piece";
import { Position } from "./Position";
import { Relic } from "./Relic";
import { Run } from "./Run";
import { RunConfig } from "./RunConfig";
import { Shape } from "./Shape";

export class Player extends EventEmitter implements IPlayer {
    attack: number;
    critical: number;
    criticalChance: number;
    criticalMultiplier: number;
    damageMultiplier: number;
    defense: number;
    difficulty: Difficulty;
    gold: number;
    health: number;
    maxHealth: number;
    maxMoves: number;
    moves: number;
    xp: number;
    luck: number;

    inventoryLimits: Limits;
    hasInventoryOpen: boolean = false;
    hasStatsOpen: boolean = false;
    hasPassiveDetailsOpen: boolean = false;
    hasRelicDetailsOpen: boolean = false;

    passive: Item;
    relic: Relic;
    items: Item[] = [];

    itemData: PlayerItemData = {
        activeItem: undefined,
        activeItem2: undefined,
        activeItem2Limits: undefined,
        activeItemLimits: undefined,
        bonusMoves: 0,
        bossCritical: 0,
        bossMoves: 0,
        colorDamageBoosts: {},
        diagonals: false,
        goldAddCount: 0,
        hasShield: false,
        hasUsedShield: false,
        moveSaverChance: 0,
        fullReachMoves: 0,
        passiveLimits: undefined,
        reach: 1,
        relicLimits: undefined,
        relicMultiplier: 1,
        rerolls: 0,
        damageBoostTimer: {
            timer: 0,
            multiplier: 1,
            label: '0.00 (x0.75)',
            hasMoved: false,
            color: Color.WHITE_1,
            interval: undefined
        },
    }

    constructor(runConfig: RunConfig) {
        super('Player');
        this.difficulty = runConfig.difficulty;

        this.maxHealth = runConfig.player.maxHealth;
        this.maxMoves = runConfig.player.maxMoves;
        this.attack = runConfig.player.attack;
        this.defense = runConfig.player.defense;
        this.damageMultiplier = runConfig.player.multiplier;
        this.critical = runConfig.player.critical;
        this.criticalChance = runConfig.player.criticalChance;
        this.criticalMultiplier = runConfig.player.criticalMultiplier;
        this.gold = runConfig.player.gold;
        this.luck = runConfig.player.luck;

        this.passive = runConfig.passive;
        this.itemData.reach = runConfig.player.reach;
        this.itemData.rerolls = runConfig.item.rerolls;
        this.itemData.relicMultiplier = runConfig.item.relicPowerMultiplier;

        this.moves = this.maxMoves;
        this.health = this.maxHealth;

        this.xp = getXP();

        this.configurePassive();
        this.configureListeners();
    }

    static defaultPlayerWith(config: RunConfig): Player {
        return new Player(config);
    }

    get totalMoves(): number {
        return this.maxMoves + this.itemData.bonusMoves;
    }

    configurePassive(): void {
        switch (this.passive?.name) {
            case 'Flexible':
                this.itemData.diagonals = true;
                break;
            case '4x4':
                this.itemData.moveSaverChance = 0.16;
                break;
        }
    }

    configureListeners(): void {
        this.on('Main:KeyPressed', (event: KeyboardEvent, run: Run) => {
            if ((event.key === 'i' || event.key === 'I')) {
                this.hasInventoryOpen = !this.hasInventoryOpen;
            }

            if (this.hasInventoryOpen && event.key === 'Escape') {
                this.hasInventoryOpen = false;
            }

            if ((event.key === 's' || event.key === 'S')) {
                this.hasStatsOpen = !this.hasStatsOpen;
            }

            if ((event.key === 'p' || event.key === 'P') && !this.hasStatsOpen) {
                this.hasPassiveDetailsOpen = !this.hasPassiveDetailsOpen;
            }

            if ((event.key === 'r' || event.key === 'R') && !this.hasStatsOpen) {
                this.hasRelicDetailsOpen = !this.hasRelicDetailsOpen;
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
                    if (this.itemData?.activeItemLimits?.contains(position)) {
                        this.useActiveItem(run);
                    }
                }

                if (this.itemData.activeItem2) {
                    if (this.itemData?.activeItem2Limits?.contains(position)) {
                        this.useActiveItem2(run);
                    }
                }

                if (this.passive) {
                    if (this.itemData?.passiveLimits?.contains(position) && !this.hasStatsOpen) {
                        this.hasPassiveDetailsOpen = !this.hasPassiveDetailsOpen;
                    }
                }

                if (this.relic) {
                    if (this.itemData?.relicLimits?.contains(position) && !this.hasStatsOpen) {
                        this.hasRelicDetailsOpen = !this.hasRelicDetailsOpen;
                    }
                }

                if (this.inventoryLimits) {
                    if (!this.inventoryLimits?.contains(position)) {
                        this.hasInventoryOpen = false
                    }
                }
            }, 0);
        });

        this.on('Run:Inventory', () => {
            this.hasInventoryOpen = true;
        });

        this.on('Run:Stats', () => {
            this.hasStatsOpen = !this.hasStatsOpen;
        });

        this.on('Run:Item:AddFullReachMove', () => {
            this.itemData.fullReachMoves++;
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
            if (this.passive?.name === 'Think Fast') {
                this.itemData.damageBoostTimer.timer = 0;
            }
        });

        this.on('Enemy:EnemyDied', (enemy: Enemy) => {
            let amount: number = enemy.attack
            if (this.hasItem('XP Boost')) {
                amount *= 1.5;
            }

            if (this.difficulty === Difficulty.EASY) {
                amount *= 0.33
            } else if (this.difficulty === Difficulty.MEDIUM) {
                amount *= 0.5
            } else if (this.difficulty === Difficulty.HARD) {
                amount *= 1
            } else if (this.difficulty === Difficulty.MASTER) {
                amount *= 1.25
            } else {
                amount = 0;
            }

            this.xp += Math.floor(amount);
        });

        this.on('Grid:FullReachMoveDone', () => {
            this.itemData.fullReachMoves--;
        });

        this.on('Run:MidasTouched', (gold: number) => {
            this.addGold(gold)
        });

        this.on('Grid:FairTrade', () => {
            this.heal(this.maxHealth / 100);
        });

        this.on('Grid:AnotherFairTrade', (choice: boolean) => {
            if (!choice) {
                this.updateMoves(this.moves + 1);
                TextController.getInstance().moveSavedAnimation();
            }
        });

        this.on('Run:Item:AllStatsUp', () => {
            this.maxHealth += 10;
            this.attack += 10;
            this.defense += 2;
            this.critical += 1;
            this.maxMoves += 1;

            this.damageMultiplier += 10;
            this.criticalMultiplier += 10;
            this.criticalChance += 2;

            this.addGold(10);
            this.updateMoves(this.moves + 1 <= this.maxMoves ? this.moves + 1 : this.maxMoves);
            this.heal(10);
        });

        this.on('Run:Item:AllStatsDown', () => {
            this.attack += 150;

            this.defense = this.defense < 2 ? 0 : this.defense - 2;
            this.maxHealth -= 10;
            this.critical -= 1;
            this.maxMoves -= 1;

            this.damageMultiplier -= 10;
            this.criticalMultiplier -= 10;
            this.criticalChance -= 2;

            this.updateMoves(this.moves - 1);
            this.damage({ damage: 10, shielded: false });
        });
    }

    get movesEnded(): boolean {
        return this.moves === 0;
    }

    get maxRelicPower(): number {
        return Math.floor(300 * this.relicPowerMultiplier)
    }

    get relicPowerMultiplier(): number {
        return (this.itemData.relicMultiplier / 100);
    }

    changeRelic(relic: Relic): void {
        if (this.relic) {
            const stats: IStat[] = [this.relic.stat1, this.relic.stat2, this.relic.stat3];
            stats.forEach((stat: IStat) => {
                this[stat.name] -= stat.bonus;

                if (stat.name === 'maxHealth') {
                    this.heal(0);
                }

                if (stat.name === 'maxMoves') {
                    if (this.moves > this.maxMoves) {
                        this.moves = this.maxMoves
                    }

                    this.updateMoves(this.moves);
                }
            });
        }
        this.relic = relic;
        const stats: IStat[] = [this.relic.stat1, this.relic.stat2, this.relic.stat3];
        stats.forEach((stat: IStat) => {
            this[stat.name] += stat.bonus;

            if (stat.name === 'maxMoves') {
                let moves = this.moves + stat.bonus;
                if (moves > this.maxMoves) {
                    moves = this.maxMoves
                }

                this.updateMoves(moves);
            }

            if (stat.name === 'maxHealth') {
                let health = stat.bonus;
                if (this.health + health > this.maxHealth) {
                    health = this.health + health - this.maxHealth
                }
                this.heal(health);
            }
        });

    }

    useActiveItem(run: Run): void {
        if (this.itemData.activeItem && !this.itemData.activeItem.disabled && !run.hasDialogOpen) {
            this.itemData.activeItem.effect();
            if (this.itemData.activeItem.frequency === Frequency.SINGLE_USE) {
                this.itemData.activeItem = undefined;
            } else {
                this.itemData.activeItem.disabled = true
            }
            run.sounds['item']?.play();
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
            run.sounds['item']?.play();
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
                        timeToAdd += 1.25;
                        break;
                    case 4:
                        timeToAdd += 2.5;
                        break;
                    default:
                        timeToAdd += 4;
                        break;
                }
            });

            this.itemData.damageBoostTimer.timer += timeToAdd * 1000;

            if (this.timeLeft > 60000) {
                this.itemData.damageBoostTimer.timer = 60000;
            }

            const updateInterval: number = 10;
            if (!this.itemData.damageBoostTimer.interval) {
                this.itemData.damageBoostTimer.interval = setInterval(() => {
                    let multiplier: number = 0.75;
                    let color: Color = Color.WHITE_1;
                    if (this.timeLeft > 0) {
                        if (this.timeLeft > 45000) {
                            multiplier = 4;
                            color = Color.GREEN;
                        } else if (this.timeLeft > 30000) {
                            multiplier = 3;
                            color = Color.YELLOW;
                        } else if (this.timeLeft > 18000) {
                            multiplier = 2;
                            color = Color.YELLOW;
                        } else if (this.timeLeft > 9000) {
                            multiplier = 1.5;
                            color = Color.ORANGE;
                        } else if (this.timeLeft > 3000) {
                            multiplier = 1;
                            color = Color.WHITE;
                        } else {
                            multiplier = 0.75;
                            color = Color.WHITE_1;
                        }
                        if (!run.hasDialogOpen && !run.pauseTimerAnimation) {
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

    hasItem(name: string): number {
        return this.items.filter((item: Item) => item.name === name).length;
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

            const activeSlotX2: number = itemLeft
            const activeSlotY2: number = (canvas.windowSize.y / 2) + (canvas.margin / 2);

            const passiveSlotX: number = itemLeft + canvas.itemSideSize / 6;
            const passiveSlotY: number = activeSlotY + canvas.itemSideSize + canvas.margin;

            const relicSlotX: number = itemLeft + canvas.itemSideSize / 6;
            const relicSlotY: number = activeSlotY - canvas.margin - (canvas.itemSideSize / 6 * 4)

            this.itemData.activeItemLimits = Position.of(activeSlotX, activeSlotY).toLimits(Position.of(canvas.itemSideSize, canvas.itemSideSize));
            this.itemData.activeItem2Limits = Position.of(activeSlotX2, activeSlotY2).toLimits(Position.of(compactItemSideSize, compactItemSideSize));
            this.itemData.passiveLimits = Position.of(passiveSlotX, passiveSlotY).toLimits(Position.of(compactItemSideSize, compactItemSideSize));
            this.itemData.relicLimits = Position.of(relicSlotX, relicSlotY).toLimits(Position.of(compactItemSideSize, compactItemSideSize));

            const opacity1: number = this.itemData.activeItemLimits.contains(canvas.mousePosition) ? 200 : 255;
            const opacity2: number = this.itemData.activeItem2Limits.contains(canvas.mousePosition) ? 200 : 255;
            const opacity3: number = this.itemData.passiveLimits.contains(canvas.mousePosition) ? 200 : 255;
            const opacity4: number = this.itemData.relicLimits.contains(canvas.mousePosition) ? 200 : 255;

            drawingContext.setLineDash([10, 10])
            startShadow(drawingContext);

            if (this.hasItem('Extra Active Item')) {
                p5.fill(Color.GRAY_3.alpha(opacity1).value);
                p5.rect(
                    activeSlotX,
                    activeSlotY,
                    canvas.itemSideSize,
                    canvas.itemSideSize / 2 - canvas.margin / 2,
                    canvas.radius
                );

                p5.fill(Color.GRAY_3.alpha(opacity2).value);
                p5.rect(
                    activeSlotX2,
                    activeSlotY2,
                    canvas.itemSideSize,
                    canvas.itemSideSize / 2 - canvas.margin / 2,
                    canvas.radius
                );
            } else {
                p5.fill(Color.GRAY_3.alpha(opacity1).value);
                p5.rect(
                    activeSlotX,
                    activeSlotY,
                    canvas.itemSideSize,
                    canvas.itemSideSize,
                    canvas.radius
                );
            }

            p5.fill(Color.GRAY_3.alpha(opacity3).value);
            p5.rect(
                passiveSlotX,
                passiveSlotY,
                compactItemSideSize,
                compactItemSideSize,
                canvas.radius
            );

            p5.fill(Color.GRAY_3.alpha(opacity4).value);
            p5.rect(
                relicSlotX,
                relicSlotY,
                compactItemSideSize,
                compactItemSideSize,
                canvas.radius
            );

            drawingContext.setLineDash([])
            endShadow(drawingContext);

            // slot 1
            if (this.itemData.activeItem) {
                const color: Color = this.itemData.activeItem.disabled ? Color.GRAY_3 : Item.rarityColors[this.itemData.activeItem.rarity].color.alpha(opacity1);

                if (!this.hasItem('Extra Active Item')) {
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
                } else {
                    startShadow(drawingContext);
                    fillFlat(color)
                    p5.rect(
                        activeSlotX,
                        activeSlotY,
                        canvas.itemSideSize,
                        canvas.itemSideSize / 2 - canvas.margin / 2,
                        canvas.radius
                    );
                    endShadow(drawingContext)

                    p5.textAlign(p5.CENTER, p5.CENTER)
                    p5.textSize(canvas.uiData.fontSubText)
                    let name: string = insertLineBreaks(this.itemData.activeItem.name, p5.map(canvas.itemSideSize - canvas.margin, 0, p5.textWidth(this.itemData.activeItem.name), 0, this.itemData.activeItem.name.length));

                    fillStroke();
                    p5.text(
                        name,
                        activeSlotX + canvas.itemSideSize / 2,
                        activeSlotY + canvas.margin * 2,
                    );

                    p5.textAlign(p5.CENTER, p5.BOTTOM)
                    fillStroke(Color.WHITE_1)
                    p5.textSize(canvas.uiData.fontDetail)
                    p5.text(
                        'Space',
                        activeSlotX + canvas.itemSideSize / 2,
                        activeSlotY + canvas.itemSideSize / 2 - canvas.margin
                    );
                }
            }

            // slot 2
            if (this.hasItem('Extra Active Item') && this.itemData.activeItem2) {
                const color: Color = this.itemData.activeItem2.disabled ? Color.GRAY_3 : Item.rarityColors[this.itemData.activeItem2.rarity].color.alpha(opacity2);

                startShadow(drawingContext);
                p5.fill(color.value);
                p5.rect(
                    activeSlotX2,
                    activeSlotY2,
                    canvas.itemSideSize,
                    canvas.itemSideSize / 2 - canvas.margin / 2,
                    canvas.radius
                );
                endShadow(drawingContext);

                p5.textAlign(p5.CENTER, p5.CENTER);
                p5.textSize(canvas.uiData.fontSubText);
                let name: string = insertLineBreaks(this.itemData.activeItem2.name, p5.map(canvas.itemSideSize - canvas.margin, 0, p5.textWidth(this.itemData.activeItem2.name), 0, this.itemData.activeItem2.name.length));

                fillStroke();
                p5.text(
                    name,
                    activeSlotX2 + canvas.itemSideSize / 2,
                    activeSlotY2 + canvas.margin * 2,
                );

                p5.textAlign(p5.CENTER, p5.BOTTOM);
                fillStroke(Color.WHITE_1);
                p5.textSize(canvas.uiData.fontDetail);
                p5.text(
                    'Enter',
                    activeSlotX2 + canvas.itemSideSize / 2,
                    activeSlotY2 + canvas.itemSideSize / 2 - canvas.margin
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

                let name: string = insertLineBreaks(this.passive.name, p5.map(compactItemSideSize - canvas.margin, 0, p5.textWidth(this.passive.name), 0, this.passive.name.length));

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
                    p5.textSize(canvas.uiData.fontSubText);
                    p5.text(
                        this.itemData.damageBoostTimer.label,
                        passiveSlotX + compactItemSideSize / 2,
                        passiveSlotY + compactItemSideSize + canvas.margin + canvas.itemSideSize / 8
                    );

                    this.drawPassiveDetail();
                }
            }

            if (this.relic) {
                startShadow(drawingContext);
                fillFlat(Color.BLUE.alpha(opacity4));
                p5.rect(
                    relicSlotX,
                    relicSlotY,
                    compactItemSideSize,
                    compactItemSideSize,
                    canvas.radius
                );
                endShadow(drawingContext);

                p5.textAlign(p5.CENTER, p5.TOP)
                fillStroke(Color.WHITE_1)
                p5.textSize(canvas.uiData.fontDetail)
                p5.text(
                    `Power: ${Math.floor(this.relic.power)}`,
                    relicSlotX + (compactItemSideSize / 2),
                    relicSlotY + (canvas.padding),
                );

                p5.textAlign(p5.CENTER, p5.CENTER);
                p5.textSize(canvas.uiData.fontSubText);

                let name: string = insertLineBreaks(this.relic.name, p5.map(compactItemSideSize - canvas.margin, 0, p5.textWidth(this.relic.name), 0, this.relic.name.length));

                fillStroke();
                p5.text(
                    name,
                    relicSlotX + compactItemSideSize / 2,
                    relicSlotY + compactItemSideSize / 2,
                );

                p5.textAlign(p5.CENTER, p5.BOTTOM)
                fillStroke(Color.WHITE_1);
                p5.textSize(canvas.uiData.fontDetail)
                p5.text(
                    'Relic',
                    relicSlotX + compactItemSideSize / 2,
                    relicSlotY + compactItemSideSize - canvas.padding
                );
                this.drawRelicDetail();
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
                    label: 'Multiplier',
                    value: `${Math.floor(this.damageMultiplier)}%`,
                },
                {
                    label: 'Critical Count',
                    value: `${formatNumber(this.critical)}`
                },
                {
                    label: 'Critical Damage',
                    value: `${Math.floor((this.criticalMultiplier - 100))}%`,
                },
            ]

            if (this.criticalChance > 0) {
                statsData.push({
                    label: 'Critical Chance',
                    value: `${Math.floor((this.criticalChance))}%`,
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
                            value: `+${Math.floor(this.itemData.colorDamageBoosts[item.name.split(' ')[0].toLowerCase()].itemData.bonusDamage)}`,
                        })
                    }
                })
            }

            statsData.push({
                label: 'Max Relic Power',
                value: `${this.maxRelicPower}`
            });

            statsData.push({
                label: 'XP',
                value: `${formatNumber(Math.floor(this.xp))}`
            });

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

    }

    drawInventory() {
        const canvas: Canvas = Canvas.getInstance();
        const p5: P5 = canvas.p5;
        const drawingContext: CanvasRenderingContext2D = p5.drawingContext as CanvasRenderingContext2D;

        if (this.hasInventoryOpen && this.items.length) {

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

            this.items.forEach((item: Item) => item.price = undefined);

            const itemShowcase: Item[] = this.countDuplicates(this.items);

            fillFlat(Color.DIM);
            p5.rect(
                0,
                0,
                canvas.windowSize.x,
                canvas.windowSize.y
            );

            let sideSize: number = canvas.itemSideSize;
            let dimension: Position = Position.of(0, 0);
            let margin: Position = Position.of(0, 0);

            let textMarginCount: number = 3;
            let lengthOffSet: number = 4 + Math.ceil(itemShowcase.length / 10);
            let maxLength: number = itemShowcase.length > lengthOffSet ? lengthOffSet : itemShowcase.length;

            dimension.x = maxLength * sideSize + ((maxLength + 1) * canvas.margin);
            margin.x = (canvas.playField.x / 2) - (dimension.x / 2);

            dimension.y = (Math.ceil(itemShowcase.length / lengthOffSet) * sideSize) + ((Math.ceil(itemShowcase.length / lengthOffSet) + textMarginCount) * canvas.margin);
            margin.y = (canvas.playField.y / 2) - (dimension.y / 2);

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

            this.inventoryLimits = Position.of(margin.x, margin.y).toLimits(Position.of(dimension.x, dimension.y));

            p5.textAlign(p5.CENTER, p5.CENTER);

            p5.fill(255);
            p5.stroke(0);
            p5.strokeWeight(canvas.stroke);
            p5.textSize(canvas.uiData.fontTitle);
            p5.text(
                'Inventory',
                canvas.playField.x / 2,
                margin.y + (textMarginCount * canvas.margin / 2)
            );

            itemShowcase.forEach((item: Item, index: number) => {
                let cumulativeMarginX: number = margin.x + ((index % lengthOffSet) * (sideSize + canvas.margin)) + canvas.margin;
                let cumulativeMarginY: number = margin.y + (Math.floor(index / lengthOffSet) * (sideSize + canvas.margin)) + (canvas.margin * textMarginCount);

                drawItem(item, Position.of(cumulativeMarginX, cumulativeMarginY), Position.of(sideSize, sideSize));
            });

        }
    }

    drawRelicDetail() {
        const canvas: Canvas = Canvas.getInstance();
        const p5: P5 = canvas.p5;

        if (this.hasRelicDetailsOpen && this.relic) {

            const height: number = canvas.itemSideSize / 2

            const slotX: number = ((canvas.gridData.marginLeft - canvas.margin) / 2) + canvas.margin - canvas.itemSideSize / 2
            const slotY: number = (canvas.windowSize.y / 2) + (canvas.itemSideSize / 2) - height - canvas.itemSideSize - (canvas.margin * 2) - canvas.itemSideSize / 6 * 4;

            fillFlat(Color.GRAY_3.alpha(200));
            p5.rect(
                slotX,
                slotY,
                canvas.itemSideSize,
                canvas.itemSideSize / 2,
                canvas.radius
            );

            p5.triangle(
                slotX + canvas.itemSideSize / 2 - canvas.margin,
                slotY + height,
                slotX + canvas.itemSideSize / 2 + canvas.margin,
                slotY + height,
                slotX + canvas.itemSideSize / 2,
                slotY + height + canvas.margin,
            );

            p5.textAlign(p5.LEFT, p5.CENTER)
            fillStroke(Color.WHITE_1)
            p5.textSize(canvas.uiData.fontDetail)
            p5.text(
                this.relic.stat1.label,
                slotX + canvas.padding,
                slotY + height / 2 - canvas.margin * 1.5
            );

            p5.text(
                this.relic.stat2.label,
                slotX + canvas.padding,
                slotY + height / 2
            );

            p5.text(
                this.relic.stat3.label,
                slotX + canvas.padding,
                slotY + height / 2 + canvas.margin * 1.5
            );

            p5.textAlign(p5.RIGHT, p5.CENTER)
            fillStroke(Color.WHITE_1)
            p5.textSize(canvas.uiData.fontDetail)
            p5.text(
                '+' + this.relic.stat1.bonus + (this.relic.stat1.isPercent ? '%' : ''),
                slotX + canvas.itemSideSize - canvas.padding,
                slotY + height / 2 - canvas.margin * 1.5
            );

            p5.text(
                '+' + this.relic.stat2.bonus + (this.relic.stat2.isPercent ? '%' : ''),
                slotX + canvas.itemSideSize - canvas.padding,
                slotY + height / 2
            );

            p5.text(
                '+' + this.relic.stat3.bonus + (this.relic.stat3.isPercent ? '%' : ''),
                slotX + canvas.itemSideSize - canvas.padding,
                slotY + height / 2 + canvas.margin * 1.5
            );
        }

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

    countDuplicates(items: Item[]): Item[] {
        const itemMap: { [key: string]: Item } = {};

        items.forEach(item => {
            if (itemMap[item.name]) {
                itemMap[item.name].count++;
            } else {
                item.count = 1;
                itemMap[item.name] = { ...item };
            }
        });

        return Object.values(itemMap);
    }
}

export interface PlayerItemData extends IPlayerItemData {
    activeItem: Item;
    activeItemLimits: Limits;
    activeItem2: Item;
    activeItem2Limits: Limits;
    passiveLimits: Limits;
    relicLimits: Limits
    colorDamageBoosts: { [key: string]: Shape }
    damageBoostTimer: DamageBoostTimerData
}

export interface DamageBoostTimerData extends IDamageBoostTimerData {
    color: Color;
}

export interface StatData {
    label: string,
    value: string
}