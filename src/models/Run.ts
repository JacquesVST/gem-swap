import * as P5 from "p5";
import { Canvas } from "../controllers/Canvas";
import { DialogController } from "../controllers/DialogController";
import { EventEmitter } from "../controllers/EventEmitter";
import { ProgressBarController } from "../controllers/ProgressBarController";
import { TextController } from "../controllers/TextController";
import { DialogType, Difficulty, IBestNumbers, IDamageData, IEventParams, IRun, IRunConfig, IRunItemData, ProgressBarIndexes } from "../interfaces";
import { endShadow, fillFlat, fillStroke, startShadow } from "../utils/Draw";
import { formatNumber } from "../utils/General";
import { getBestNumbers, setBestNumbers } from "../utils/LocalStorage";
import { Cell } from "./Cell";
import { Color } from "./Color";
import { DefaultDialogOption, Dialog, DialogOption, ItemDialogOption, NavigationDialogOption, PassiveDialogOption } from "./Dialog";
import { Effect } from "./Effect";
import { BossEnemy, Enemy, MiniBossEnemy } from "./Enemy";
import { Floor } from "./Floor";
import { Item, ItemPools } from "./Item";
import { Map } from "./Map";
import { Piece } from "./Piece";
import { Player } from "./Player";
import { Position } from "./Position";
import { Shape } from "./Shape";
import { EnemyStage, ItemStage, MiniBossStage, ShopStage, Stage } from "./Stage";

export class Run extends EventEmitter implements IRun {
    player: Player;
    costMultiplier: number;
    canvas: Canvas;
    map: Map;
    difficulty: Difficulty;

    score: number = 0;
    combo: number = 0;
    damage: number = 0;
    dots: number = 0;

    itemOptions: number = 3;
    defeatedEnemies: number = 0;
    consecutiveCombo: number = 0;
    possibleShapes: Shape[] = [];
    possibleEffects: Effect[] = [];
    inAnimation: boolean = false;
    stackCombo: boolean = false;
    enemyDetailsOpen: boolean = false;

    sounds: { [key: string]: P5.SoundFile };

    itemData: IRunItemData = {
        lastShapeIds: [],
        wasDiagonalMove: false,
        lastDialogParams: {}
    }

    constructor(config: RunConfig, sounds: { [key: string]: P5.SoundFile }) {
        super('Run');

        this.sounds = sounds;
        this.difficulty = config.difficulty;
        this.costMultiplier = config.costMultiplier;
        this.player = Player.defaultPlayerWith(config.item);
        this.possibleShapes = Shape.defaultShapes();

        if (config?.item?.name === 'Less Is More') {
            const index = Math.floor(Math.random() * this.possibleShapes.length);
            this.possibleShapes = this.possibleShapes.filter((shape: Shape) => shape.id !== this.possibleShapes[index].id);
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
                this.emit('InitGrid', this);
            }

            if (stage instanceof ShopStage) {
                this.newShopDialog(2, false, () => {
                    this.sounds['item'].play();

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
                    this.sounds['item'].play();
                    this.emit('AllowNextStage');
                });
            }
        });

        this.on('Run:InitialItemSelected', () => {
            this.sounds['item'].play();
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
                this.player.maxMoves = this.player.totalMoves;
                this.player.moves = this.player.totalMoves;
                this.updateMoves();
            }

            if (!enemy.isLast) {
                this.sounds['enemyDefeat'].play();
            }


            if (enemy.hasDrop) {
                let isMiniBoss = enemy instanceof MiniBossEnemy;
                let rarities: string[] = isMiniBoss ? ['Common', 'Rare', 'Epic'] : ['Common', 'Rare'];

                this.newRandomDropDialog(rarities, () => {
                    this.updateTopProgressBars();
                    this.updateHealth();
                    this.updateMoves();

                    this.sounds['item'].play();
                    this.emit('Next');
                });
            } else {
                this.emit('Next');
            }
        });

        this.on('Grid:MoveDone', () => {
            if (this.combo > 0) {
                this.emit('ApplyCritical', this.player.critical + (this.map.isBoss ? this.player.itemData.bossCrits : 0));
                if (this.player?.passive?.name === 'Think Fast') {
                    this.player.resetTimer();
                    this.player.itemData.damageBoostTimer.hasMoved = true;
                }
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
                this.sounds['move'].play();
            } else {
                this.sounds['noMove'].play();
            }
        });

        this.on('Grid:SwapDone', () => {
            this.updatePlayerMoves();
        });

        this.on('Grid:GridStabilized:Init', () => {
            this.emit('ApplyCritical', this.player.critical + (this.map.isBoss ? this.player.itemData.bossCrits : 0));
            this.updateTopProgressBars();
            this.player.resetTimer();

            if (this.map.stage.number === 1 && this.map.floor.number > 1) {
                TextController.getInstance().newFloorAnimation();
            }
        });

        this.on('Grid:FirstClickFound', () => {
            this.stackCombo = false;
            this.sounds['select'].play();
            this.updateCombo([]);
            this.updateDamage(0);
        });

        this.on('Grid:SecondClickFound', () => {
            this.stackCombo = true;
        });

        this.on('Grid:MatchesRemoved:GridCleared:NextStage', () => {

            if (this.map.stage instanceof MiniBossStage) {
                this.newPercDialog(() => {
                    this.sounds['item'].play();

                    this.updateTopProgressBars();
                    this.updateHealth();
                    this.updateMoves();
                    this.emit('AllowNextStage');
                })
            } else {
                this.emit('AllowNextStage');
            }
        });

        this.on('Grid:MatchesRemoved:GridCleared:NextFloor', () => {
            this.newShopDialog(3, true, () => {
                this.sounds['item'].play();

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
            this.emit('RunEnded', 'You won!', this.score, new Color(46, 204, 113));
        });

        this.on('Grid:MatchesRemoved:GridCleared:PlayerDied', () => {
            this.emit('RunEnded', 'You Lost!', this.score, new Color(231, 76, 60));
        });

        this.on('Grid:ClearingGrid:GridCleared:NextStage', () => {
            this.sounds['bossDefeat'].play();
        });

        this.on('Grid:ClearingGrid:GridCleared:NextFloor', () => {
            this.sounds['newFloor'].play();
        });

        this.on('Grid:ClearingGrid:GridCleared:MapEnded', () => {
            this.sounds['newFloor'].play();
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

        this.on('DialogController:ItemPurchased', (price: number) => {
            this.player.addGold(-price);
        });

        this.on('DialogController:Reroll', (dialog: Dialog) => {
            this.player.itemData.rerolls -= 1;
            DialogController.getInstance().clear();
            const params: any = this.itemData.lastDialogParams;

            if (dialog.type === DialogType.ITEM) {
                this.newPercDialog(params.callback);
            }

            if (dialog.type === DialogType.SHOP) {
                this.newShopDialog(params.amount, params.forceHealth, params.selectCallback, params.closeCallback);
            }

            if (dialog.type === DialogType.SKIPPABLE_ITEM) {
                if (params.initial) {
                    this.newInitialItemDialog();
                } else {
                    this.newRandomDropDialog(params.rarities, params.callback);
                }
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
        if (this.player.hasItem('Moves as you Crits')) {
            this.player.itemData.bonusMoves = this.player.critical
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

        fillStroke();
        p5.textStyle(p5.ITALIC);
        p5.textAlign(p5.CENTER, p5.CENTER);
        p5.textSize(canvas.uiData.fontText);

        p5.text(
            '(S)tats',
            canvas.windowSize.x / 2 - canvas.itemSideSize / 2,
            canvas.windowSize.y - canvas.uiData.bottomUiSize
        );

        p5.text(
            '(I)nventory',
            canvas.windowSize.x / 2 + canvas.itemSideSize / 2,
            canvas.windowSize.y - canvas.uiData.bottomUiSize
        );
        p5.textStyle(p5.NORMAL);

    }

    drawEnemyDetails() {
        const canvas: Canvas = Canvas.getInstance();
        const p5: P5 = canvas.p5;

        if (this.enemyDetailsOpen) {

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

        if (this.player.hasItem('4+ Match Regeneration')) {
            matches.forEach((match: Piece[]) => {
                if (match.length >= 4) {
                    let itemStack: number = this.player.items.filter((item: Item) => item.name === '4+ Match Regeneration').length
                    this.player.heal(itemStack);
                    this.updateHealth();
                }
            });
        }

        this.updateCombo(matches);

        let totalDamage: number = 0;
        matches.forEach((match: Piece[]) => {
            totalDamage += this.updateScore(match);
        });
        this.damageEnemy(totalDamage);
    }

    updateCombo(matches: Piece[][]): void {
        if (matches.length === 0) {
            this.combo = 0;
        }

        if (this.stackCombo) {
            this.combo += [...matches].length;
            if (this.combo > 1 && this.player.hasItem('Valuable combo')) {
                let goldAmount: number = this.combo;
                this.player.addGold(goldAmount);
            }
        }

        let bests: IBestNumbers = getBestNumbers();
        bests.bestCombo = bests.bestCombo > this.combo ? bests.bestCombo : this.combo;
        setBestNumbers(bests);

    }

    updateScore(match: Piece[]): number {
        let bonusDamage: number = 0;
        if (match[0]?.shape) {
            bonusDamage = match[0].shape.itemData.bonusDamage;
        }

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

        if (Math.random() < this.player.itemData.criticalChance) {
            criticalInMatch = true;
            if (this.player?.passive?.name === 'Natural Crit') {
                damageMultiplier = damageMultiplier * 1.1;
            }
        }

        if (this.player?.passive?.name === 'Think Fast') {
            damageMultiplier = damageMultiplier * this.player.itemData.damageBoostTimer.multiplier;
        }

        criticalInMatch = this.player.items.filter((item: Item) => item.name === 'tirC').length % 2 === 1 ? !criticalInMatch : criticalInMatch;

        let criticalMultiplier: number = this.player.criticalMultiplier;

        if (match.every((piece: Piece) => piece.critical) && this.player.items.filter((item: Item) => item.name === 'tirC').length % 2 === 0) {
            criticalMultiplier = Math.pow(criticalMultiplier, match.length);
        }

        if (this.player?.passive?.name === 'Midas Touched') {
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
            this.sounds['crit'].play();
        } else {
            this.sounds['match'].play();
        }

        let additiveScore: number = (this.player.attack + bonusDamage) * lengthMultiplier * damageMultiplier;
        additiveScore *= this.player.hasItem('Combos multiply DMG') ? this.combo : 1;
        additiveScore *= criticalInMatch ? criticalMultiplier : 1;

        additiveScore = Math.floor(additiveScore);

        this.score += additiveScore;

        let bests: IBestNumbers = getBestNumbers();
        bests.bestScore = bests.bestScore > this.score ? bests.bestScore : this.score;
        setBestNumbers(bests);

        if (match?.length) {
            let cell1: Cell = this.map.grid.getCellbyPosition(match[0].gridPosition);
            let cell2: Cell = this.map.grid.getCellbyPosition(match[match.length - 1].gridPosition);
            let position: Position = cell1.canvasPosition.average(cell2.canvasPosition);

            TextController.getInstance().damageAnimation(additiveScore, criticalInMatch, position, match[0]?.shape);
            this.updateDamage(additiveScore);
            this.player.xp += match.length * (criticalInMatch ? 2 : 1);
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
        setBestNumbers(bests);
    }

    damageEnemy(damage: number): void {
        damage = damage * this.player.damageMultiplier;
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

        this.sounds['defeat'].play();
        TextController.getInstance().damagePlayerAnimation(damage);
        this.updateHealth(this.player.health - damage.damage, { useCase: 'DamagePlayer', data: { damage: damage } })
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
                index
            ));
        let dialog: Dialog = new Dialog(
            'Choose your destination',
            'Higher risk higher reward',
            options,
            DialogType.NAVIGATION
        );

        DialogController.getInstance().dialogs.push(dialog);
    }

    newRandomDropDialog(rarities: string[], callback: () => void): void {
        let itemList: Item[] = Item.generateItemsBasedOnRarity(
            1,
            ItemPools.defaultPool(this),
            rarities,
            this.player
        );

        let dialog: Dialog = new Dialog(
            'Enemy Loot',
            'You may take it',
            ItemDialogOption.itemListToDialogOption(itemList, this, callback),
            DialogType.SKIPPABLE_ITEM,
            callback
        );

        this.itemData.lastDialogParams = {
            rarities,
            callback
        }

        DialogController.getInstance().dialogs.unshift(dialog);
    }

    newPercDialog(callback: () => void): void {
        let itemList: Item[] = Item.generateItemsBasedOnRarity(
            this.itemOptions,
            ItemPools.defaultPool(this),
            ['Common', 'Rare'],
            this.player
        );

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

    newShopDialog(amount: number, forceHealth: boolean, selectCallback: () => void, closeCallback?: (id?: string) => void): void {
        let itemList: Item[] = Item.generateItemsBasedOnRarity(
            amount,
            ItemPools.shopPool(this),
            ['Common', 'Rare', 'Epic'],
            this.player,
            true
        );

        if (forceHealth) {
            itemList = [ItemPools.fullHealthShopItem(this), ...itemList];
        }

        let dialog: Dialog = new Dialog(
            'Floor item shop',
            'Buy what you can with your gold',
            ItemDialogOption.itemListToDialogOption(itemList, this, selectCallback),
            DialogType.SHOP,
            closeCallback
        );

        this.itemData.lastDialogParams = {
            amount,
            forceHealth,
            selectCallback,
            closeCallback
        }

        DialogController.getInstance().dialogs.unshift(dialog);
    }

    newInitialItemDialog(): void {
        let itemList: Item[] = Item.generateItemsBasedOnRarity(
            this.itemOptions,
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

        let options: ItemDialogOption[] = itemList.map((item: Item) => {
            return new ItemDialogOption(
                () => {
                    dialogController.emit('PassiveChosen', item);
                },
                Item.rarityColors[item.rarity].color,
                item
            );
        });

        return new Dialog(
            'Select a passive ability to build arround',
            'You can switch freely before starting the run',
            options,
            DialogType.SKIPPABLE_ITEM,
            () => { dialogController.emit('PassiveChosen', undefined) },
        );

    }

    static newGameDialog(status?: string, score?: number, color?: Color, item?: Item): Dialog {
        let dialogController = DialogController.getInstance();

        let options: DialogOption[] = [
            new DefaultDialogOption(
                () => {
                    dialogController.emit('DifficultyChosen', {
                        enemies: 5,
                        stages: 3,
                        floors: 3,
                        gridX: 12,
                        gridY: 8,
                        costMultiplier: 1,
                        difficulty: Difficulty.EASY,
                        item

                    })
                },
                new Color(46, 204, 113),
                'Easy',
                '3 Floors',
                '12x8 grid'
            ),
            new DefaultDialogOption(
                () => {
                    dialogController.emit('DifficultyChosen', {
                        enemies: 8,
                        stages: 5,
                        floors: 5,
                        gridX: 10,
                        gridY: 8,
                        costMultiplier: 1.5,
                        difficulty: Difficulty.MEDIUM,
                        item
                    })
                },
                new Color(244, 208, 63),
                'Normal',
                '5 Floors',
                '10x8 grid'
            ),
            new DefaultDialogOption(
                () => {
                    dialogController.emit('DifficultyChosen', {
                        enemies: 10,
                        stages: 8,
                        floors: 8,
                        gridX: 8,
                        gridY: 6,
                        costMultiplier: 2,
                        difficulty: Difficulty.HARD,
                        item
                    })
                },
                new Color(231, 76, 60),
                'Hard',
                '8 Floors',
                '8x6 grid'
            ),
        ];

        if (localStorage.getItem('dev')) {
            options.unshift(new DefaultDialogOption(
                () => {
                    dialogController.emit('DifficultyChosen', {
                        enemies: 2,
                        stages: 5,
                        floors: 5,
                        gridX: 10,
                        gridY: 8,
                        costMultiplier: 1,
                        difficulty: Difficulty.DEBUG,
                        item
                    });
                },
                new Color(224, 224, 224),
                'SpeedRun',
            ));
        }

        options.push(new PassiveDialogOption(
            () => {
                dialogController.emit('SelectPassive')
            },
            Color.GRAY_3,
            item
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

export interface RunConfig extends IRunConfig {
    item: Item
}