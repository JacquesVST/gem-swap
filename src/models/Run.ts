import * as P5 from "p5";
import { Canvas } from "../controllers/Canvas";
import { DialogController } from "../controllers/DialogController";
import { EventEmitter } from "../controllers/EventEmitter";
import { ProgressBarController } from "../controllers/ProgressBarController";
import { TextController } from "../controllers/TextController";
import { DialogType, Difficulty, IBestNumbers, IDamageData, IEventParams, IRun, IRunItemData, IStat, IStatRange, IUnlocks, ProgressBarIndexes } from "../interfaces";
import { endShadow, fillFlat, fillStroke, icon, startShadow } from "../utils/Draw";
import { formatNumber, writeCamel } from "../utils/General";
import { getBestNumbers, getUnlocks, getUpgrades, setBestNumbers, setRunConfig, setUnlocks } from "../utils/LocalStorage";
import { Cell } from "./Cell";
import { Color } from "./Color";
import { DefaultDialogOption, Dialog, DialogOption, ItemDialogOption, NavigationDialogOption, PassiveDialogOption, RelicDialogOption } from "./Dialog";
import { Effect } from "./Effect";
import { BossEnemy, Enemy, MiniBossEnemy } from "./Enemy";
import { Floor } from "./Floor";
import { Icon } from "./Icon";
import { Item, ItemPools } from "./Item";
import { Limits } from "./Limits";
import { Map } from "./Map";
import { Piece } from "./Piece";
import { Player } from "./Player";
import { Position } from "./Position";
import { Relic } from "./Relic";
import { RunConfig } from "./RunConfig";
import { Shape } from "./Shape";
import { EnemyStage, ItemStage, MiniBossStage, ShopStage, Stage } from "./Stage";
import { Upgrade, UpgradeOption } from "./Upgrade";

export class Run extends EventEmitter implements IRun {
    player: Player;
    canvas: Canvas;
    runConfig: RunConfig;
    map: Map;

    score: number = 0;
    combo: number = 0;
    damage: number = 0;
    dots: number = 0;

    defeatedEnemies: number = 0;
    consecutiveCombo: number = 0;
    possibleShapes: Shape[] = [];
    possibleEffects: Effect[] = [];

    stackCombo: boolean = false;
    inAnimation: boolean = false;
    enemyDetailsOpen: boolean = false;
    pauseTimerAnimation: boolean = false;

    sounds: { [key: string]: P5.SoundFile };

    itemData: IRunItemData = {
        lastShapeIds: [],
        wasDiagonalMove: false,
        lastDialogParams: {}
    }

    limits: {
        stats: Limits,
        inventory: Limits,
        quit: Limits,
    }

    constructor(config: RunConfig, sounds: { [key: string]: P5.SoundFile }) {
        super('Run');

        const overrideConfig = {}
        new Upgrade(getUpgrades()).options.forEach((option: UpgradeOption) => {
            overrideConfig[option.property] = option.formatValue(option.points)
        });

        this.runConfig = config.withAdditiveFlatConfig(overrideConfig);

        this.sounds = sounds;
        this.player = Player.defaultPlayerWith(config);
        this.possibleShapes = Shape.defaultShapes(config.grid.colorCount);

        if (config.item.startWithRelic) {
            this.player.changeRelic(this.generateRelic());
        }

        this.canvas = Canvas.getInstance();
        this.map = new Map(config, this);

        this.configureListeners();
        this.newInitialItemDialog();

        ProgressBarController.getInstance().initialize(this);
    }

    get hasDialogOpen(): boolean {
        return !!DialogController.getInstance().currentDialog;
    }

    configureListeners(): void {
        this.on('Player:AddedGold', (gold: number) => {
            TextController.getInstance().goldAnimation(gold);
        })

        this.on('Player:Healed', (heal: number) => {
            this.updateHealth();
            TextController.getInstance().playerHealedAnimaiton(heal);
        })

        this.on('Player:PlayerDied', () => {
            this.updateHealth(0)
        });

        this.on('Main:KeyPressed', (event: KeyboardEvent, run: Run) => {
            if ((event.key === 'e' || event.key === 'E') && !run.hasDialogOpen) {
                this.enemyDetailsOpen = !this.enemyDetailsOpen;
            }
        });

        this.on('Main:MouseClicked:Click', (position: Position, run?: Run) => {
            setTimeout(() => {
                if (DialogController.getInstance().currentDialog) {
                    return;
                }

                if (this.limits.stats) {
                    if (this.limits.stats.contains(position)) {
                        this.emit('Stats')
                    }
                }

                if (this.limits.inventory) {
                    if (this.limits.inventory.contains(position)) {
                        this.emit('Inventory')
                    }
                }

                if (this.limits.quit) {
                    if (this.limits.quit.contains(position)) {
                        this.emit('Quit')
                    }
                }
            }, 0);
        });


        this.on('Grid:DiscountDiagonals', () => {
            this.itemData.wasDiagonalMove = true;
        });

        this.on('Piece:StartedAnimation', () => {
            this.inAnimation = true;
        });

        this.on('Piece:AnimationEnded', () => {
            this.inAnimation = false;
        });

        this.on('Map:NextEnemyReached', () => {
            this.defeatedEnemies++;
            this.updateTopProgressBars();
            this.updateHealth();
            this.updateMoves();
        });

        this.on('Map:NextStageReached', () => {
            if (!this.map.winState) {
                this.consecutiveCombo = 0;
                this.itemData.lastShapeIds = [];
                this.player.updateMoves(this.player.totalMoves);
                this.updateMoves();
                this.newNavigationDialog();
            }
        });

        this.on('Map:NextFloorReached', () => {
            if (!this.map.winState) {
                this.player.updateMoves(this.player.totalMoves);
                this.updateMoves();
                this.emit('InitGrid', this);

                if (this.player?.passive?.name === 'Gambler') {
                    this.player.itemData.rerolls += 1;
                }
            }
        });

        this.on('Map:ResumeRun', (stage: Stage) => {
            this.updateTopProgressBars();
            this.updateMoves();

            this.player.updateMoves(this.player.totalMoves);

            if (stage instanceof EnemyStage) {
                this.pauseTimerAnimation = true;
                this.emit('InitGrid', this);
            }

            if (stage instanceof ShopStage) {
                this.newShopDialog(() => {
                    this.sounds['item']?.play();

                    this.updateHealth();
                    this.updateMoves();
                }, (id?: string) => {
                    this.updateTopProgressBars();
                    this.updateHealth();
                    this.updateMoves();

                    DialogController.getInstance().close(id);
                    this.emit('AllowNextStage');
                });
            }

            if (stage instanceof ItemStage) {
                this.newPercDialog(() => {
                    this.sounds['item']?.play();
                    this.emit('AllowNextStage');
                });
            }
        });

        this.on('Run:InitialItemSelected', () => {
            this.sounds['item']?.play();
            this.updateScore([]);
            this.updateCombo([]);
            this.updateDamage(0);

            this.updateMoves();
            this.updateHealth();

            this.emit('InitGrid', this);
        });

        this.on('ProgressBar:ProgressBarUpdated:DamagePlayer', (data: any) => {
            this.player.damage(data.damage);
        });

        // Grid events

        this.on('Grid:GridStabilized:Death', () => {
            let enemy: Enemy = this.map.enemy;
            this.player.addGold(enemy.gold)

            if (this.map.findNextEnemy() instanceof BossEnemy) {
                TextController.getInstance().bossFightAnimation();
                this.player.itemData.bonusMoves += this.player.itemData.bossMoves;
                this.player.moves += this.player.itemData.bossMoves;
                this.updateMoves();
            }

            if (enemy instanceof BossEnemy) {
                this.player.itemData.bonusMoves -= this.player.itemData.bossMoves;
                this.player.moves = this.player.totalMoves;
                this.updateMoves();
            }

            if (!enemy.isLast) {
                this.sounds['enemyDefeat']?.play();
            }


            if (enemy.hasDrop) {
                let isMiniBoss = enemy instanceof MiniBossEnemy;
                let rarities: string[] = isMiniBoss ? ['Common', 'Rare', 'Epic'] : ['Common', 'Rare'];

                let isRelic: boolean = (Math.random() * 100) < this.runConfig.item.relicDropChance;
                if (this.player.passive?.name === 'Collector') {
                    isRelic = Math.random() < 0.2;
                }

                this.newRandomDropDialog(isRelic, rarities, () => {
                    this.sounds['item']?.play();
                    this.updateTopProgressBars();
                    this.updateHealth();
                    this.updateMoves();
                    this.emit('Next');
                });
            } else {
                this.emit('Next');
            }
        });

        this.on('Grid:MoveDone', () => {
            if (this.combo > 0) {
                this.emit('ApplyCritical', this.player.critical + (this.map.isBoss ? this.player.itemData.bossCrits : 0));
            } else {
                this.map.grid.isUnstable = false;
            }

            if (this.player.movesEnded) {
                this.reload();
                this.updateMoves();
            }
        });

        this.on('Grid:MatchesRemoved:Loop', (matches: Piece[][]) => {
            this.processMacthList(matches);
        });

        this.on('Grid:SwapValidated', (valid: boolean) => {
            if (valid) {
                this.sounds['move']?.play();
            } else {
                this.sounds['noMove']?.play();
            }
        });

        this.on('Grid:SwapDone', () => {
            this.updatePlayerMoves();
        });

        this.on('Grid:GridStabilized:Init', () => {
            this.pauseTimerAnimation = false
            this.emit('ApplyCritical', this.player.critical + (this.map.isBoss ? this.player.itemData.bossCrits : 0));
            this.updateTopProgressBars();
            this.map.debugEnemies();

            if (this.map.stage.number === 1 && this.map.floor.number > 1) {
                TextController.getInstance().newFloorAnimation();
            }
        });

        this.on('Grid:FirstClickFound', () => {
            this.stackCombo = false;
            this.sounds['select']?.play();
            this.updateCombo([]);
            this.updateDamage(0);
        });

        this.on('Grid:SecondClickFound', () => {
            this.stackCombo = true;
        });

        this.on('Grid:MatchesRemoved:GridCleared:NextStage', () => {
            if (this.map.stage instanceof MiniBossStage) {
                this.newPercDialog(() => {
                    this.sounds['item']?.play();

                    this.updateTopProgressBars();
                    this.updateHealth();
                    this.updateMoves();
                    this.emit('AllowNextStage');
                }, true)
            } else {
                this.emit('AllowNextStage');
            }
        });

        this.on('Grid:MatchesRemoved:GridCleared:NextFloor', () => {
            this.newShopDialog(() => {
                this.sounds['item']?.play();

                this.updateHealth();
                this.updateMoves();
            }, (id?: string) => {
                this.updateTopProgressBars();
                this.updateHealth();
                this.updateMoves();

                DialogController.getInstance().close(id);
                this.emit('AllowNextFloor');
            });
        });

        this.on('Grid:MatchesRemoved:GridCleared:MapEnded', () => {
            this.sounds = {};
            this.pauseTimerAnimation = false;
            const currentUnlock: IUnlocks = {
                item: this.player?.passive.name,
                date: new Date(),
                tier: this.runConfig.difficulty
            }


            const unlocks: IUnlocks[] = getUnlocks();

            let index = unlocks.findIndex((unlock: IUnlocks) => {
                return unlock.item === this.player?.passive.name
            });

            if (index === -1) {
                unlocks.push(currentUnlock);
            } else {
                if (currentUnlock.tier > unlocks[index].tier) {
                    unlocks[index] = currentUnlock;
                }
            }

            if (this.runConfig.difficulty !== Difficulty.CUSTOM) {
                setUnlocks(unlocks)
            }
            this.emit('RunEnded', 'You won!', this.score, new Color(46, 204, 113));
        });

        this.on('Grid:MatchesRemoved:GridCleared:PlayerDied', () => {
            this.pauseTimerAnimation = false;
            this.emit('RunEnded', 'You Lost!', this.score, new Color(231, 76, 60));
        });

        this.on('Grid:ClearingGrid:GridCleared:NextStage', () => {
            this.pauseTimerAnimation = true;
            this.sounds['bossDefeat']?.play();
        });

        this.on('Grid:ClearingGrid:GridCleared:NextFloor', () => {
            this.pauseTimerAnimation = true;
            this.sounds['newFloor']?.play();
        });

        this.on('Grid:ClearingGrid:GridCleared:MapEnded', () => {
            this.pauseTimerAnimation = true;
            this.sounds['newFloor']?.play();
        });

        // Item events 

        this.on('Run:Item:ColorDamageBoost', (id: string, bonus: number) => {
            this.possibleShapes.forEach((shape: Shape) => {
                if (shape.id === id) {
                    shape.itemData.bonusDamage += bonus;
                    this.player.itemData.colorDamageBosts[shape.id] = shape
                }
            });
        });

        this.on('Run:Item:BanShape', (id: string) => {
            this.possibleShapes = this.possibleShapes.filter((shape: Shape) => shape.id !== id);
            this.emit('BanShape', id, this);
        });

        this.on('Run:Item:Money', () => {
            this.player.addGold(1)
        });

        this.on('Run:Item:ConcentrateColor', (id: string) => {
            const damageBoosts: number = this.player.items.filter((item: Item) => item.name.endsWith('Color Boost')).length
            this.player.items = this.player.items.filter((item: Item) => !item.name.endsWith('Color Boost'));

            this.possibleShapes.forEach((shape: Shape) => {
                shape.itemData.bonusDamage = 0;
                if (this.player.itemData.colorDamageBosts[shape.id]?.itemData?.bonusDamage) {
                    this.player.itemData.colorDamageBosts[shape.id].itemData.bonusDamage = 0;
                }
            });

            for (let index: number = 0; index < damageBoosts; index++) {
                const item: Item = new Item(
                    'Common',
                    `${id.charAt(0).toUpperCase() + id.slice(1)} Color Boost`,
                    `+50 base DMG on ${id} shapes`,
                    () => {
                        this.emit('Item:ColorDamageBoost', id, 50);
                    }
                );
                this.player.items.push(item)
                item.effect();
            }
        });

        this.on('Run:Item:UniversalTradeoff', () => {
            const damageBoosts: number = this.player.items.filter((item: Item) => item.name.endsWith('Color Boost')).length
            this.player.items = this.player.items.filter((item: Item) => !item.name.endsWith('Color Boost'));

            for (let index: number = 0; index < damageBoosts; index++) {
                const item: Item = new Item(
                    'Common',
                    'Damage Boost',
                    '+25 base DMG',
                    () => {
                        this.player.attack += 25;
                    }
                );
                this.player.items.push(item)
                item.effect();
            }
        });

        this.on('DialogController:ItemPurchased', (price: number) => {
            this.player.addGold(-price);
        });

        this.on('DialogController:Reroll', (dialog: Dialog) => {
            this.player.itemData.rerolls -= 1;
            DialogController.getInstance().clear();
            const params: any = this.itemData.lastDialogParams;

            if (dialog.type === DialogType.ITEM) {
                if (params.isRelic) {
                    this.newRandomDropDialog(params.isRelic, params.rarities, params.callback);
                } else {
                    this.newPercDialog(params.callback);
                }
            }

            if (dialog.type === DialogType.SHOP) {
                this.newShopDialog(params.selectCallback, params.closeCallback);
            }

            if (dialog.type === DialogType.SKIPPABLE_ITEM) {
                if (params.initial) {
                    this.newInitialItemDialog();
                } else {
                    this.newRandomDropDialog(params.isRelic, params.rarities, params.callback);
                }
            }
        });


        this.on('Grid:AnotherFairTrade', (choice: boolean) => {
            if (choice) {
                this.sounds['defeat']?.play();
                TextController.getInstance().damagePlayerAnimation({ damage: Math.floor(this.player.maxHealth / 100), shielded: false });
                this.updateHealth(this.player.health - Math.floor(this.player.maxHealth / 100), { useCase: 'DamagePlayer', data: { damage: Math.floor(this.player.maxHealth / 100) } })
            }
        });

    }

    updateTopProgressBars(): void {
        this.emit('UpdateProgressBar', ProgressBarIndexes.FLOOR, ProgressBarController.floorBar(this))
        this.emit('UpdateProgressBar', ProgressBarIndexes.STAGE, ProgressBarController.stageBar(this))

        let enemy: Enemy = this.map.enemy;

        if (enemy) {
            this.emit('UpdateProgressBar', ProgressBarIndexes.ENEMY, ProgressBarController.enemyHealthBar(this, enemy.health))
        }
    }

    updateEnemy(newHealth?: number, params?: IEventParams): void {
        this.emit('UpdateProgressBar', ProgressBarIndexes.ENEMY, ProgressBarController.enemyHealthBar(this, !isNaN(newHealth) ? newHealth : this.map.enemy.health), params)
    }


    updateHealth(newHealth?: number, params?: IEventParams): void {
        this.emit('UpdateProgressBar', ProgressBarIndexes.HEALTH, ProgressBarController.yourHealthBar(this.player.maxHealth, !isNaN(newHealth) ? newHealth : this.player.health), params);
    }

    updateMoves(): void {
        if (this.player.hasItem('2 Crits, 1 Move')) {
            this.player.itemData.bonusMoves = Math.floor(this.player.critical / 2)
        }
        this.emit('UpdateProgressBar', ProgressBarIndexes.MOVES, ProgressBarController.yourMovesBar(this.player.totalMoves, this.player.moves));
    }

    draw(): void {
        this.map.grid?.draw(!!DialogController.getInstance().currentDialog);
        this.map.grid?.drawPieces();
        this.drawNumbers();
        this.drawEnemyDetails();
        this.player.draw();
    }

    drawNumbers(): void {
        const canvas: Canvas = Canvas.getInstance();
        const p5: P5 = canvas.p5;

        const rectLeft: number = canvas.gridData.marginRight + canvas.margin;
        const rectRight: number = canvas.windowSize.x - canvas.margin * 2
        const referenceY: number = canvas.windowSize.y / 2;
        const textLeft = rectLeft + canvas.padding;
        const textRight = rectRight - canvas.padding;

        const width: number = rectRight - rectLeft;
        const height: number = canvas.itemSideSize / 2.5;

        // Rects

        const drawingContext: CanvasRenderingContext2D = p5.drawingContext as CanvasRenderingContext2D;

        startShadow(drawingContext);

        fillFlat(Color.GRAY_3)
        p5.rect(
            rectLeft,
            referenceY - height * 2 - canvas.margin * 1.5,
            width,
            height,
            canvas.radius
        );
        p5.rect(
            rectLeft,
            referenceY - height - canvas.margin / 2,
            width,
            height,
            canvas.radius
        );
        p5.rect(
            rectLeft,
            referenceY + canvas.margin / 2,
            width,
            height,
            canvas.radius
        );
        p5.rect(
            rectLeft,
            referenceY + height + canvas.margin * 1.5,
            width,
            height,
            canvas.radius
        );

        endShadow(drawingContext);

        // Currents
        fillStroke();
        p5.textAlign(p5.LEFT, p5.CENTER);
        p5.textSize(canvas.uiData.fontText);
        p5.text(
            'Score',
            textLeft,
            referenceY - height * 1.5 - canvas.margin * 2
        );

        p5.text(
            'Damage',
            textLeft,
            referenceY - height / 2 - canvas.margin
        );

        p5.text(
            'Combo',
            textLeft,
            referenceY + height / 2
        );

        p5.textAlign(p5.RIGHT, p5.CENTER);
        p5.text(
            formatNumber(this.score),
            textRight,
            referenceY - height * 1.5 - canvas.margin * 2
        );

        p5.text(
            formatNumber(this.damage),
            textRight,
            referenceY - height / 2 - canvas.margin
        );

        p5.text(
            formatNumber(this.combo),
            textRight,
            referenceY + height / 2
        );

        // Bests
        const bests: IBestNumbers = getBestNumbers();

        fillStroke(Color.WHITE_1);
        p5.textAlign(p5.LEFT, p5.CENTER);
        p5.textSize(canvas.uiData.fontSubText);
        p5.text(
            'Best',
            textLeft,
            referenceY - height * 1.5 - canvas.margin / 2
        );

        p5.text(
            'Best',
            textLeft,
            referenceY - height / 2 + canvas.margin / 2
        );

        p5.text(
            'Best',
            textLeft,
            referenceY + height / 2 + canvas.margin * 1.5
        );

        p5.textAlign(p5.RIGHT, p5.CENTER);
        p5.text(
            formatNumber(bests.bestScore),
            textRight,
            referenceY - height * 1.5 - canvas.margin / 2
        );

        p5.text(
            formatNumber(bests.bestDamage),
            textRight,
            referenceY - height / 2 + canvas.margin / 2
        );

        p5.text(
            formatNumber(bests.bestCombo),
            textRight,
            referenceY + height / 2 + canvas.margin * 1.5
        );

        // Gold

        fillStroke(Color.YELLOW)
        p5.textAlign(p5.LEFT, p5.CENTER)
        p5.textSize(canvas.uiData.fontText)
        p5.text(
            'Gold',
            textLeft,
            referenceY + height * 1.5 + canvas.margin * 1.5
        );

        p5.textAlign(p5.RIGHT, p5.CENTER)
        p5.text(
            `$ ${this.player.gold}`,
            textRight,
            referenceY + height * 1.5 + canvas.margin * 1.5
        );

        // Info

        fillStroke(Color.WHITE)
        icon(Icon.STATS, Position.of(textRight, referenceY + height * 3));
        p5.text(
            '(S)tats',
            textRight - canvas.margin * 2,
            referenceY + height * 3
        );

        icon(Icon.GRID, Position.of(textRight, referenceY + height * 4));
        p5.text(
            '(I)nventory',
            textRight - canvas.margin * 2,
            referenceY + height * 4
        );

        icon(Icon.CLOSE, Position.of(textRight, referenceY + height * 5));
        p5.text(
            '(Q)uit',
            textRight - canvas.margin * 2,
            referenceY + height * 5
        );

        this.limits = {
            stats: Position.of(
                textLeft + width / 2,
                referenceY + height * 2.5
            ).toLimits(Position.of(
                width / 2,
                height
            )),
            inventory: Position.of(
                textLeft + width / 2,
                referenceY + height * 3.5
            ).toLimits(Position.of(
                width / 2,
                height
            )),
            quit: Position.of(
                textLeft + width / 2,
                referenceY + height * 4.5
            ).toLimits(Position.of(
                width / 2,
                height
            )),
        }


    }

    drawEnemyDetails() {
        const canvas: Canvas = Canvas.getInstance();
        const p5: P5 = canvas.p5;

        if (this.enemyDetailsOpen && this.map.stage instanceof EnemyStage) {

            let slotX: number = canvas.windowSize.x - canvas.margin - ((canvas.margin * 1.5 + canvas.itemSideSize + canvas.gridData.horizontalCenterPadding / 2 - canvas.padding) / 2) - (canvas.itemSideSize / 2);
            let slotY: number = canvas.uiData.topUiSize + canvas.margin * 2 + canvas.padding;

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
            p5.fill(255);
            p5.stroke(0);
            p5.strokeWeight(canvas.stroke);
            p5.textSize(canvas.uiData.fontText)
            p5.text(
                this.map.enemy.name,
                slotX + canvas.itemSideSize / 2,
                slotY + canvas.margin + canvas.padding
            );

            p5.textAlign(p5.LEFT, p5.CENTER)
            p5.fill(200);
            p5.stroke(0);
            p5.strokeWeight(canvas.stroke);
            p5.textSize(canvas.uiData.fontText)
            p5.text(
                'Attack',
                slotX + canvas.padding,
                slotY + (canvas.itemSideSize / 12) * 3
            );

            p5.textAlign(p5.RIGHT, p5.CENTER)
            p5.text(
                formatNumber(this.map.enemy.attack),
                slotX + canvas.itemSideSize - canvas.padding,
                slotY + (canvas.itemSideSize / 12) * 3
            );

        }
    }

    processMacthList(matches: Piece[][]): void {
        if (this.combo === 0) {
            let shapeIds: string[] = [];

            let keep: boolean = false;
            matches.forEach((match: Piece[]) => {
                let firstShapeId: string = match[0].shape.id;
                if (match.every((piece: Piece) => piece.shape.id === firstShapeId)) {
                    if (this.itemData.lastShapeIds.includes(firstShapeId)) {
                        keep = true
                    }
                    shapeIds.push(firstShapeId);
                }
            });

            this.consecutiveCombo = keep ? this.consecutiveCombo + 1 : 0;
            this.itemData.lastShapeIds = shapeIds;
        }

        const matchRegenerationItemStack: number = this.player.hasItem('4+ Match Regeneration')
        if (matchRegenerationItemStack) {
            matches.forEach((match: Piece[]) => {
                if (match.length >= 4) {
                    this.player.heal(matchRegenerationItemStack);
                    this.updateHealth();
                }
            });
        }

        this.updateCombo(matches);

        let totalDamage: number = 0;
        matches.forEach((match: Piece[]) => {
            totalDamage += this.updateScore(match);
        });

        if (this.player?.passive?.name === 'Think Fast') {
            this.player.incrementTimer(matches, this);
        }

        this.damageEnemy(totalDamage);
    }

    updateCombo(matches: Piece[][]): void {
        if (matches.length === 0) {
            this.combo = 0;
        }

        if (this.stackCombo) {
            this.combo += [...matches].length;
            if (this.combo > 1 && this.player.hasItem('Valuable combo')) {
                let goldAmount: number = 1;
                this.player.addGold(goldAmount);
            }
        }

        let bests: IBestNumbers = getBestNumbers();
        bests.bestCombo = bests.bestCombo > this.combo ? bests.bestCombo : this.combo;

        if (this.runConfig.difficulty !== Difficulty.CUSTOM) {
            setBestNumbers(bests);
        }

    }

    updateScore(match: Piece[]): number {
        let bonusDamage: number = 0;

        match.forEach((piece: Piece) => {
            bonusDamage += piece.shape?.itemData?.bonusDamage ?? 0;
        })

        let criticalInMatch: boolean = match.some((piece: Piece) => piece.critical);

        let lengthMultiplier = match.length;
        if (this.player.hasItem('Hit Streak')) {
            lengthMultiplier += (this.consecutiveCombo);
        }

        let damageMultiplier = this.player.damageMultiplier;

        if (this.itemData?.wasDiagonalMove) {
            damageMultiplier = damageMultiplier * 0.9;
            this.itemData.wasDiagonalMove = false;
        }

        if (Math.random() < (this.player.criticalChance / 100)) {
            criticalInMatch = true;
            if (this.player?.passive?.name === 'Natural Crit') {
                damageMultiplier = damageMultiplier * 1.1;
            }
        }

        if (this.player?.passive?.name === 'Think Fast') {
            damageMultiplier = damageMultiplier * this.player.itemData.damageBoostTimer.multiplier;
        }

        criticalInMatch = this.player.hasItem('tirC') % 2 === 1 ? !criticalInMatch : criticalInMatch;

        let criticalMultiplier: number = this.player.criticalMultiplier / 100;

        if (match.every((piece: Piece) => piece.critical) && this.player.hasItem('tirC') % 2 === 0) {
            criticalMultiplier = Math.pow(criticalMultiplier, match.length);
        }

        if (this.player?.passive?.name === 'Midas Touched The Walls') {
            let borderPieces: boolean = false
            match.forEach((piece: Piece) => {
                borderPieces = (
                    piece.gridPosition.x === 0 ||
                    piece.gridPosition.x === this.map.grid.width - 1 ||
                    piece.gridPosition.y === 0 ||
                    piece.gridPosition.y === this.map.grid.height - 1
                );
            })
            this.emit('MidasTouched', (criticalInMatch ? 2 : 1) * (borderPieces ? 1 : 0));
        }

        if (criticalInMatch) {
            this.sounds['crit']?.play();
        } else {
            this.sounds['match']?.play();
        }

        let additiveScore: number = (((this.player.attack) * lengthMultiplier) + bonusDamage) * damageMultiplier / 100;
        additiveScore *= this.player.hasItem('Combos Multiply DMG') ? this.combo : 1;
        additiveScore *= criticalInMatch ? criticalMultiplier : 1;

        additiveScore = Math.floor(additiveScore);

        this.score += additiveScore;

        let bests: IBestNumbers = getBestNumbers();
        bests.bestScore = bests.bestScore > this.score ? bests.bestScore : this.score;
        if (this.runConfig.difficulty !== Difficulty.CUSTOM) {
            setBestNumbers(bests);
        }

        if (match?.length) {
            let cell1: Cell = this.map.grid.getCellbyPosition(match[0].gridPosition);
            let cell2: Cell = this.map.grid.getCellbyPosition(match[match.length - 1].gridPosition);
            let position: Position = cell1.canvasPosition.average(cell2.canvasPosition);

            TextController.getInstance().damageAnimation(additiveScore, criticalInMatch, position, match[0]?.shape);
            this.updateDamage(additiveScore);
        }

        return additiveScore;
    }

    updateDamage(damageDealt: number): void {
        if (damageDealt === 0) {
            this.damage = 0;
        }

        this.damage += damageDealt;

        let bests: IBestNumbers = getBestNumbers();
        bests.bestDamage = bests.bestDamage > this.damage ? bests.bestDamage : this.damage;

        if (this.runConfig.difficulty !== Difficulty.CUSTOM) {
            setBestNumbers(bests);
        }
    }

    damageEnemy(damage: number): void {
        const enemy: Enemy = this.map.enemy;
        const finalDamage: number = enemy.simulateDamage(damage);
        this.updateEnemy(enemy.health - finalDamage, { useCase: 'DamageEnemy', data: { damage: finalDamage } });
    }

    updatePlayerMoves(): void {
        this.inAnimation = true;
        let movesLeft: number = this.player.moves - 1;
        if (Math.random() < this.player.itemData.moveSaverChance) {
            movesLeft = this.player.moves;
            TextController.getInstance().moveSavedAnimation();
        }
        this.player.updateMoves(movesLeft);
        this.updateMoves();
    }

    reload(): void {
        this.player.updateMoves(this.player.maxMoves + this.player.itemData.bonusMoves);
        let damage: IDamageData = this.player.simulateDamage(this.map.enemy);

        this.sounds['defeat']?.play();
        TextController.getInstance().damagePlayerAnimation(damage);
        this.updateHealth(this.player.health - damage.damage, { useCase: 'DamagePlayer', data: { damage: damage } })
    }

    generateRelic(): Relic {
        const p5: P5 = Canvas.getInstance().p5;
        let power: number = 0;

        const possibleStats: IStatRange[] = [
            {
                name: 'maxHealth',
                min: 3,
                max: 30,
            },
            {
                name: 'attack',
                min: 5,
                max: 50,
            },
            {
                name: 'maxMoves',
                min: 1,
                max: 3,
            },
            {
                name: 'damageMultiplier',
                min: 20,
                max: 100,
            },
            {
                name: 'critical',
                min: 1,
                max: 3,
            },
            {
                name: 'criticalMultiplier',
                min: 20,
                max: 100,
            },
            {
                name: 'criticalChance',
                min: 2,
                max: 10,
            },
            {
                name: 'defense',
                min: 2,
                max: 10,
            },
        ];

        const chosenStats: IStatRange[] = possibleStats.sort(() => Math.random() - Math.random()).slice(0, 3);

        const stats: IStat[] = chosenStats.map((statRange: IStatRange) => {
            let currentPower: number = p5.random(0, 100) * this.player.relicPowerMultiplier;

            power += currentPower
            return {
                name: statRange.name,
                bonus: Math.floor(p5.map(currentPower, 0, 100, statRange.min, statRange.max)),
                rawBonus: currentPower,
                label: writeCamel(statRange.name),
                isPercent: ['criticalChance', 'criticalMultiplier', 'damageMultiplier'].includes(statRange.name)
            }
        })

        return new Relic(Math.floor(power), ...stats);
    }

    newNavigationDialog(callback?: (index: number) => void): void {
        let floor: Floor = this.map.floor;
        let options: NavigationDialogOption[] = floor.stages[floor.currentStageIndex].map((stage: Stage, index: number) =>
            new NavigationDialogOption(
                () => {
                    if (callback) {
                        callback(index)
                    }
                },
                stage.color,
                stage,
                index,
                stage.icon,
                Math.random() < 0.333,
            ));
        let dialog: Dialog = new Dialog(
            'Choose your destination',
            'Higher risk higher reward',
            options,
            DialogType.NAVIGATION
        );

        DialogController.getInstance().dialogs.push(dialog);
    }

    newRandomDropDialog(isRelic: boolean, rarities: string[], callback: () => void): void {
        let dialog: Dialog;
        if (isRelic) {
            dialog = new Dialog(
                'Enemy Relic',
                `Max Relic Power: ${this.player.maxRelicPower}`,
                [RelicDialogOption.relicToDialogOption(this.generateRelic(), this, callback)],
                DialogType.ITEM,
                () => {
                    if (callback) {
                        callback();
                    }
                },
                undefined,
                this
            );
        } else {
            let items: Item[] = Item.generateItemsBasedOnRarity(
                1,
                ItemPools.defaultPool(this),
                rarities,
                this.player
            );

            dialog = new Dialog(
                'Enemy Loot',
                'You may take it',
                ItemDialogOption.itemListToDialogOption(items, this, callback),
                DialogType.SKIPPABLE_ITEM,
                () => {
                    this.player.addGold(items[0].rarity === 'Common' ? 10 : 25);
                    if (callback) {
                        callback();
                    }
                }
            );
        }

        this.itemData.lastDialogParams = {
            isRelic,
            rarities,
            callback
        }

        DialogController.getInstance().dialogs.unshift(dialog);
    }

    newPercDialog(callback: () => void, withRelic: boolean = false): void {
        let itemList: Item[] = Item.generateItemsBasedOnRarity(
            withRelic ? this.runConfig.item.itemOptions - 1 : this.runConfig.item.itemOptions,
            ItemPools.defaultPool(this),
            ['Common', 'Rare'],
            this.player
        );

        if (withRelic) {
            itemList.push(ItemPools.freeRelicItem(this, callback))
        }

        let dialog: Dialog = new Dialog(
            'Pick an item',
            'Choose one from the options below',
            ItemDialogOption.itemListToDialogOption(itemList, this, callback),
            DialogType.ITEM,
            undefined,
        );

        this.itemData.lastDialogParams = {
            callback
        }

        DialogController.getInstance().dialogs.unshift(dialog);
    }

    newShopDialog(selectCallback: () => void, closeCallback?: (id?: string) => void): void {
        let itemList: Item[] = Item.generateItemsBasedOnRarity(
            this.runConfig.item.shopOptions,
            ItemPools.shopPool(this),
            ['Rare', 'Epic'],
            this.player,
            true
        );

        itemList = [ItemPools.fullHealthShopItem(this), ...itemList];

        let dialog: Dialog = new Dialog(
            'Floor item shop',
            'Buy what you can with your gold',
            ItemDialogOption.itemListToDialogOption(itemList, this, selectCallback),
            DialogType.SHOP,
            closeCallback
        );

        this.itemData.lastDialogParams = {
            selectCallback,
            closeCallback
        }

        DialogController.getInstance().dialogs.unshift(dialog);
    }

    newInitialItemDialog(): void {
        let itemList: Item[] = Item.generateItemsBasedOnRarity(
            this.runConfig.item.itemOptions,
            ItemPools.defaultPool(this).filter((item: Item) => {
                return item.name !== 'Instant Health';
            }),
            ['Common'],
            this.player
        );

        let dialog: Dialog = new Dialog(
            'Pick a starting item',
            'Make your run different from the last',
            ItemDialogOption.itemListToDialogOption(itemList, this, () => this.emit('InitialItemSelected')),
            DialogType.SKIPPABLE_ITEM,
            () => this.emit('InitialItemSelected')
        );

        this.itemData.lastDialogParams = {
            initial: true
        }

        DialogController.getInstance().dialogs.push(dialog);
    }

    static passiveSelectorDialog(): Dialog {
        let dialogController = DialogController.getInstance();
        let itemList: Item[] = ItemPools.passivePool();

        let options: ItemDialogOption[] = itemList.map((passive: Item) => {
            return new ItemDialogOption(
                () => {
                    dialogController.emit('PassiveChosen', passive);
                },
                Item.rarityColors[passive.rarity].color,
                passive
            );
        });

        return new Dialog(
            'Select a passive ability to build around',
            'You can switch freely before starting the run',
            options,
            DialogType.SKIPPABLE_ITEM,
            () => { dialogController.emit('PassiveChosen', undefined) },
        );

    }

    static upgradesDialog(passive: Item): Dialog {
        let dialogController = DialogController.getInstance();
        const options: DefaultDialogOption[] = [
            new DefaultDialogOption(
                () => {
                    dialogController.emit('PassiveChosen', passive)
                },
                Color.DISABLED,
                'Close'
            )
        ];

        return new Dialog(
            'Experience leads to power',
            'Spend XP in exchange for upgrade points',
            options,
            DialogType.UPGRADES,
        );
    }


    static customRunDialog(passive: Item): Dialog {
        let dialogController = DialogController.getInstance();
        const options: DefaultDialogOption[] = [
            new DefaultDialogOption(
                () => {
                    setRunConfig([]);
                    dialogController.emit('CustomRunReset', passive)
                },
                Color.DISABLED,
                'Reset'
            ),
            new DefaultDialogOption(
                () => {
                    dialogController.emit('PassiveChosen', passive)
                },
                Color.DISABLED,
                'Close'
            ),
            new DefaultDialogOption(
                (runConfig: RunConfig) => {
                    dialogController.emit('CustomRunConfigured', runConfig, passive)
                },
                Color.GREEN,
                'Start'
            ),
        ]

        return new Dialog(
            'Configure custom run',
            'Tweak the values to your liking',
            options,
            DialogType.CUSTOM_RUN,
        );
    }

    static newGameDialog(status?: string, score?: number, color?: Color, passive?: Item): Dialog {
        let dialogController = DialogController.getInstance();

        let options: DialogOption[] = [
            new DefaultDialogOption(
                () => {
                    dialogController.emit('CustomDifficulty', passive);
                },
                Color.CYAN,
                'Custom',
                'Configure your run',
                'No Progression',
                Icon.GEAR
            ),
            new DefaultDialogOption(
                () => {
                    dialogController.emit('DifficultyChosen', RunConfig.easy(passive))
                },
                Color.GREEN,
                'Easy',
                '3 Floors',
                '12x8 Grid',
                Icon.MEDAL
            ),
            new DefaultDialogOption(
                () => {
                    dialogController.emit('DifficultyChosen', RunConfig.medium(passive))
                },
                Color.YELLOW,
                'Normal',
                '5 Floors',
                '10x8 Grid',
                Icon.TROPHY
            ),
            new DefaultDialogOption(
                () => {
                    dialogController.emit('DifficultyChosen', RunConfig.hard(passive))
                },
                Color.RED,
                'Hard',
                '8 Floors',
                '8x6 Grid',
                Icon.CROWN
            ),
            new DefaultDialogOption(
                () => {
                    dialogController.emit('DifficultyChosen', RunConfig.master(passive))
                },
                Color.PURPLE,
                'Master',
                '10 Floors',
                'Extra color',
                Icon.SKULL
            ),
        ];

        options.push(new PassiveDialogOption(
            () => {
                dialogController.emit('SelectPassive')
            },
            Color.GRAY_3,
            passive
        ), new DefaultDialogOption(
            () => {
                dialogController.emit('UpgradesDialog', passive)
            },
            Color.BLUE,
            'Upgrades'
        ));

        let subtext: string = !isNaN(score) ? `With a score of ${formatNumber(score)}. Go again?` : 'Select difficulty'

        return new Dialog(
            status ?? 'New Run',
            subtext,
            options,
            DialogType.INITIAL,
            undefined,
            color
        );
    }
}
