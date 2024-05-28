import * as P5 from "p5";
import { checkPositionInLimit, formatNumber, getBestNumbers, setBestNumbers } from "../utils/Functions";
import { CanvasInfo } from "./CanvasInfo";
import { Cell } from "./Cell";
import { Color } from "./Color";
import { DefaultDialogOption, Dialog, DialogController, DialogType, ItemDialogOption, NavigationDialogOption } from "./Dialog";
import { Effect } from "./Effect";
import { BossEnemy, Enemy, MiniBossEnemy } from "./Enemy";
import { ConfigureListeners, EventEmitter, EventParams } from "./EventEmitter";
import { Floor } from "./Floor";
import { Item, ItemPools } from "./Item";
import { Map } from "./Map";
import { Piece } from "./Piece";
import { DamageData, Player } from "./Player";
import { Position } from "./Position";
import { ProgressBar } from "./ProgressBar";
import { Shape } from "./Shape";
import { EnemyStage } from "./Stage";
import { TextAnimationController } from "./TextAnimation";

export class Run extends EventEmitter implements ConfigureListeners {
    p5: P5;
    player: Player;
    maxMoves: number;
    costMultiplier: number;

    textAnimationController: TextAnimationController;
    dialogController: DialogController;
    canvas: CanvasInfo;
    map: Map;
    possibleShapes: Shape[];
    progressBars: ProgressBar[];

    score: number = 0;
    combo: number = 0;
    damage: number = 0;
    dots: number = 0;
    itemOptions: number = 3;
    defeatedEnemies: number = 0;
    consecutiveCombo: number = 0;
    possibleEffects: Effect[] = [];
    lastShapeIds: string[] = [];
    inAnimation: boolean = false;
    stackCombo: boolean = false;
    enemyDetailsOpen: boolean = false;

    sounds: { [key: string]: P5.SoundFile };
    //controls: { [key: string]: HTMLElement };

    itemData: any = {
        bonusMoves: 0
    }

    constructor(p5: P5, player: Player, config: RunConfig, sounds: { [key: string]: P5.SoundFile }, controls: { [key: string]: HTMLElement }) {
        super('Run');

        this.p5 = p5;
        this.player = player;
        this.maxMoves = config.moves;
        this.costMultiplier = config.costMultiplier;
        this.player.moves = config.moves;
        this.sounds = sounds;
        //this.controls = controls;

        this.textAnimationController = TextAnimationController.getInstance();
        this.dialogController = DialogController.getInstance();
        this.canvas = CanvasInfo.getInstance();

        this.map = new Map(config, 1, this);
        this.possibleShapes = Shape.defaultShapes();
        this.progressBars = this.generateInitialProgressBars();

        this.configureListeners();
        this.newInitialItemDialog();
    }

    get hasDialogOpen(): boolean {
        return !!this.dialogController.currentDialog;
    }

    configureListeners(): void {
        this.on('Player:AddedGold', (gold: number) => {
            this.textAnimationController.goldAnimation(gold);
        })

        this.on('Main:MouseClicked:Click', (click: Position) => {
            if (this.hasDialogOpen, this.player.hasInventoryOpen) {
                return;
            }

            this.progressBars.forEach((progressBar: ProgressBar, index: number) => {
                if (checkPositionInLimit(click, ...progressBar.limits) && index === 2) {
                    this.enemyDetailsOpen = !this.enemyDetailsOpen;
                }
            })
        });

        this.on('Main:KeyPressed', (event: KeyboardEvent, run: Run) => {
            if ((event.key === 'e' || event.key === 'E') && !run.hasDialogOpen) {
                this.enemyDetailsOpen = !this.enemyDetailsOpen;
            }
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
                this.lastShapeIds = [];
                this.player.updateMoves(this.maxMoves + this.itemData.bonusMoves);
                this.newNavigationDialog();
            }
        });

        this.on('Map:NextFloorReached', () => {
            if (!this.map.winState) {
                this.player.updateMoves(this.maxMoves + this.itemData.bonusMoves);
                this.emit('InitGrid', this);
            }
        });

        this.on('Map:ResumeRun', () => {
            this.updateTopProgressBars();
            this.updateMoves();

            this.player.updateMoves(this.maxMoves + this.itemData.bonusMoves);
            this.emit('InitGrid', this);
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

        this.on('ProgressBar:ProgressBarUpdated:DamagePlayer', (data: DamageData) => {
            this.player.damage(data);
        });

        // Grid events

        this.on('Grid:GridStabilized:Death', () => {
            let enemy: Enemy = this.map.enemy;
            this.player.addGold(enemy.gold)

            if (this.map.findNextEnemy() instanceof BossEnemy) {
                this.textAnimationController.bossFightAnimation();
            }

            if (!enemy.isLast) {
                this.sounds['enemyDefeat'].play();
            }

            if (enemy.hasDrop) {
                let isMiniBoss = enemy instanceof MiniBossEnemy;
                let rarities: string[] = isMiniBoss ? ['Rare', 'Epic'] : ['Common', 'Rare'];

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
                this.emit('ApplyCritical', this.player.critical + (this.map.isBoss ? this.player.itemData.bossCritical : 0));
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
            this.emit('ApplyCritical', this.player.critical + (this.map.isBoss ? this.player.itemData.bossCritical : 0));
            this.updateTopProgressBars();
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
            this.newPercDialog(() => {
                this.updateHealth();
                this.updateMoves();

                this.sounds['item'].play();
                this.emit('AllowNextStage');
            });
        });

        this.on('Grid:MatchesRemoved:GridCleared:NextFloor', () => {
            this.newPercDialog(() => {
                this.updateHealth();
                this.updateMoves();

                this.sounds['item'].play();
                this.newShopDialog(() => {
                    this.sounds['item'].play();

                    this.updateHealth();
                    this.updateMoves();
                }, () => {
                    this.updateTopProgressBars();
                    this.updateHealth();
                    this.updateMoves();

                    this.dialogController.close();
                    this.emit('AllowNextFloor');
                });
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
                    shape.bonusDmg += bonus;
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

    }

    generateInitialProgressBars(): ProgressBar[] {
        let enemy: Enemy = this.map.enemy;
        let stage: EnemyStage = this.map.stage;
        let floor: Floor = this.map.floor;

        return [
            new ProgressBar(
                this.map.floors.length,
                floor.number,
                'Floor',
                new Color(244, 208, 63),
                true
            ),
            new ProgressBar(
                this.map.floor.stages.length,
                stage.number,
                'Stage',
                new Color(46, 134, 193),
                true
            ),
            new ProgressBar(
                enemy.health,
                enemy.currentHealth,
                `${enemy.name} Health (${enemy.number}/${this.map.stage.enemies.length})`,
                enemy.color,
                true
            ),
            new ProgressBar(
                this.player.health,
                this.player.currentHealth,
                'Your Health',
                new Color(231, 76, 60),
                false
            ),
            new ProgressBar(
                this.player.moves,
                this.maxMoves + this.itemData.bonusMoves,
                'Your Moves',
                new Color(46, 204, 113),
                false
            )
        ];
    }

    updateTopProgressBars(): void {
        this.updateProgressBar(ProgressBarIndexes.FLOOR, ProgressBar.floorBar(this));
        this.updateProgressBar(ProgressBarIndexes.STAGE, ProgressBar.stageBar(this));

        let enemy: Enemy = this.map.enemy;

        if (enemy) {
            this.updateProgressBar(ProgressBarIndexes.ENEMY, ProgressBar.enemyHealthBar(enemy, enemy.currentHealth, this.map.stage.enemies.length));
        }
    }

    updateHealth(): void {
        this.updateProgressBar(ProgressBarIndexes.HEALTH, ProgressBar.yourHealthBar(this.player.health, this.player.currentHealth));
    }

    updateMoves(): void {
        if (this.player.hasItem('Moves as you Crits')) {
            this.itemData.bonusMoves = this.player.critical
        }
        this.updateProgressBar(ProgressBarIndexes.MOVES, ProgressBar.yourMovesBar(this.maxMoves + this.itemData.bonusMoves, this.player.moves));
    }

    updateProgressBar(index: ProgressBarIndexes, newProgressBar: ProgressBar, params?: EventParams): void {
        let difference: number = this.progressBars[index].value - newProgressBar.value;
        if (difference !== 0) {
            this.inAnimation = true;
            this.progressBars[index] = newProgressBar;
            this.progressBars[index].animate(difference, params);
        } else {
            if (params) {
                this.events.emit('ProgressBar:ProgressBarUpdated:' + params.useCase, params.data);
            }
        }
    }

    draw(): void {
        this.progressBars.forEach((element: ProgressBar, index: number) => {
            element.drawBar(index, this.canvas);
        });
        this.map.grid.draw(!!this.dialogController.currentDialog);
        this.map.grid.drawPieces();
        this.drawNumbers(this.canvas);
        this.drawEnemyDetails(this.canvas)
        this.player.draw(this.canvas)
    }

    drawNumbers(canvas: CanvasInfo): void {
        const p5: P5 = canvas.p5

        let height: number = canvas.itemSideSize / 4


        let horizontalCenterPadding: number = canvas.canvasSize.x - canvas.margin - ((canvas.margin * 1.5 + canvas.itemSideSize + canvas.gridInfo.horizontalCenterPadding / 2 - canvas.padding) / 2) - (canvas.itemSideSize / 2);

        let numbersSlotX: number = horizontalCenterPadding
        let numbersSlotY: number = canvas.canvasSize.y / 2;

        let bests: BestNumbers = getBestNumbers();

        if (canvas.horizontalLayout) {
            // score
            p5.noStroke()
            p5.fill(60);
            p5.rect(
                numbersSlotX,
                numbersSlotY - height * 2 - canvas.margin * 1.5,
                canvas.itemSideSize,
                height,
                canvas.radius
            );

            p5.textAlign(p5.LEFT, p5.CENTER)
            p5.fill(255);
            p5.stroke(0);
            p5.strokeWeight(3);
            p5.textSize(24)
            p5.text(
                'Score',
                numbersSlotX + canvas.padding,
                numbersSlotY - height * 1.5 - canvas.margin * 2,
            );

            p5.textAlign(p5.RIGHT, p5.CENTER)
            p5.text(
                formatNumber(this.score),
                numbersSlotX + canvas.itemSideSize - canvas.padding,
                numbersSlotY - height * 1.5 - canvas.margin * 2,
            );

            p5.textAlign(p5.LEFT, p5.CENTER)
            p5.fill(200);
            p5.textSize(16)
            p5.text(
                'Best',
                numbersSlotX + canvas.padding,
                numbersSlotY - height * 1.5 - canvas.margin / 2,
            );

            p5.textAlign(p5.RIGHT, p5.CENTER)
            p5.text(
                formatNumber(bests.bestScore),
                numbersSlotX + canvas.itemSideSize - canvas.padding,
                numbersSlotY - height * 1.5 - canvas.margin / 2,
            );


            // damage
            p5.noStroke()
            p5.fill(60);
            p5.rect(
                numbersSlotX,
                numbersSlotY - height - canvas.margin / 2,
                canvas.itemSideSize,
                height,
                canvas.radius
            );

            p5.textAlign(p5.LEFT, p5.CENTER)
            p5.fill(255);
            p5.stroke(0);
            p5.strokeWeight(3);
            p5.textSize(24)
            p5.text(
                'Damage',
                numbersSlotX + canvas.padding,
                numbersSlotY - height / 2 - canvas.margin
            );

            p5.textAlign(p5.RIGHT, p5.CENTER)
            p5.text(
                formatNumber(this.damage),
                numbersSlotX + canvas.itemSideSize - canvas.padding,
                numbersSlotY - height / 2 - canvas.margin
            );

            p5.textAlign(p5.LEFT, p5.CENTER)
            p5.fill(200);
            p5.textSize(16)
            p5.text(
                'Best',
                numbersSlotX + canvas.padding,
                numbersSlotY - height / 2 + canvas.margin / 2
            );

            p5.textAlign(p5.RIGHT, p5.CENTER)
            p5.text(
                formatNumber(bests.bestDamage),
                numbersSlotX + canvas.itemSideSize - canvas.padding,
                numbersSlotY - height / 2 + canvas.margin / 2
            );

            // combo
            p5.noStroke()
            p5.fill(60);
            p5.rect(
                numbersSlotX,
                numbersSlotY + canvas.margin / 2,
                canvas.itemSideSize,
                height,
                canvas.radius
            );

            p5.textAlign(p5.LEFT, p5.CENTER)
            p5.fill(255);
            p5.stroke(0);
            p5.strokeWeight(3);
            p5.textSize(24)
            p5.text(
                'Combo',
                numbersSlotX + canvas.padding,
                numbersSlotY + height / 2
            );

            p5.textAlign(p5.RIGHT, p5.CENTER)
            p5.text(
                formatNumber(this.combo),
                numbersSlotX + canvas.itemSideSize - canvas.padding,
                numbersSlotY + height / 2
            );

            p5.textAlign(p5.LEFT, p5.CENTER)
            p5.fill(200);
            p5.textSize(16)
            p5.text(
                'Best',
                numbersSlotX + canvas.padding,
                numbersSlotY + height / 2 + canvas.margin * 1.5,
            );

            p5.textAlign(p5.RIGHT, p5.CENTER)
            p5.text(
                formatNumber(bests.bestCombo),
                numbersSlotX + canvas.itemSideSize - canvas.padding,
                numbersSlotY + height / 2 + canvas.margin * 1.5,
            );

            // gold

            p5.noStroke()
            p5.fill(60);
            p5.rect(
                numbersSlotX,
                numbersSlotY + height + canvas.margin * 1.5,
                canvas.itemSideSize,
                height,
                canvas.radius
            );

            p5.textAlign(p5.LEFT, p5.CENTER)
            p5.fill(...Color.YELLOW.value, 255);
            p5.stroke(0);
            p5.strokeWeight(3);
            p5.textSize(24)
            p5.text(
                'Gold',
                numbersSlotX + canvas.padding,
                numbersSlotY + height * 1.5 + canvas.margin * 1.5,
            );

            p5.textAlign(p5.RIGHT, p5.CENTER)
            p5.fill(...Color.YELLOW.value, 255);
            p5.textSize(24)
            p5.text(
                `$ ${this.player.gold}`,
                numbersSlotX + canvas.itemSideSize - canvas.padding,
                numbersSlotY + height * 1.5 + canvas.margin * 1.5,
            );


        }

        p5.textStyle(p5.ITALIC)
        p5.textAlign(p5.CENTER, p5.CENTER)
        p5.fill(255);
        p5.textSize(20)
        p5.text(
            '(S)tats',
            canvas.canvasSize.x / 2 - canvas.itemSideSize / 2,
            canvas.canvasSize.y - canvas.bottomUiSize
        );

        p5.textAlign(p5.CENTER, p5.CENTER)
        p5.fill(255);
        p5.textSize(20)
        p5.text(
            '(I)nventory',
            canvas.canvasSize.x / 2 + canvas.itemSideSize / 2,
            canvas.canvasSize.y - canvas.bottomUiSize
        );
        p5.textStyle(p5.NORMAL)
    }

    drawEnemyDetails(canvas: CanvasInfo) {
        const p5: P5 = canvas.p5;

        if (this.enemyDetailsOpen) {

            let slotX: number = canvas.canvasSize.x - canvas.margin - ((canvas.margin * 1.5 + canvas.itemSideSize + canvas.gridInfo.horizontalCenterPadding / 2 - canvas.padding) / 2) - (canvas.itemSideSize / 2);
            let slotY: number = canvas.topUiSize + canvas.margin * 2 + canvas.padding;

            p5.noStroke()
            p5.fill(60, 200);
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
            p5.strokeWeight(3);
            p5.textSize(20)
            p5.text(
                this.map.enemy.name,
                slotX + canvas.itemSideSize / 2,
                slotY + canvas.margin + canvas.padding
            );

            p5.textAlign(p5.LEFT, p5.CENTER)
            p5.fill(200);
            p5.stroke(0);
            p5.strokeWeight(3);
            p5.textSize(20)
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
                    if (this.lastShapeIds.includes(firstShapeId)) {
                        keep = true
                    }
                    shapeIds.push(firstShapeId);
                }
            });

            this.consecutiveCombo = keep ? this.consecutiveCombo + 1 : 0;
            this.lastShapeIds = shapeIds;
        }

        if (this.player.hasItem('4+ Match Regeneration')) {
            matches.forEach((match: Piece[]) => {
                if (match.length >= 4) {
                    let itemStack: number = this.player.items.filter((item: Item) => item.name === '4+ Match Regeneration').length
                    let heal: number = itemStack * 0.01 * this.player.health
                    this.player.heal(heal);
                    this.updateHealth();
                    this.textAnimationController.playerHealedAnimaiton(heal);
                }
            });
        }

        this.updateCombo(matches);

        let totalDamage: number = 0;
        matches.forEach((match: Piece[]) => {
            totalDamage += this.updateScore(match);
        });
        if (this.map.enemy) {
            this.damageEnemy(totalDamage);
        }
    }

    updateCombo(matches: Piece[][]): void {
        if (matches.length === 0) {
            this.combo = 0;
            //this.controls['comboCounter'].setAttribute('style', 'font-size: 1em');
        }

        if (this.stackCombo) {
            this.combo += [...matches].length;
            if (this.combo > 1 && this.player.hasItem('Valuable combo')) {
                let goldAmount: number = this.combo;
                this.player.addGold(goldAmount);
            }
        }
        //this.controls['comboCounter'].innerHTML = formatNumber(this.combo);

        let bests: BestNumbers = getBestNumbers();
        bests.bestCombo = bests.bestCombo > this.combo ? bests.bestCombo : this.combo;
        //this.controls['bestComboCounter'].innerHTML = formatNumber(bests.bestCombo);
        setBestNumbers(bests);

        let fontSize: number = this.combo > 0 ? ((this.combo / bests.bestCombo) * 2 >= 1 ? (this.combo / bests.bestCombo) * 2 : 1) : 1;
        //this.controls['comboCounter'].setAttribute('style', 'font-size: ' + fontSize + 'em; ' + (bests.bestCombo === this.combo && this.combo !== 0 ? 'color: red' : 'color: white'));
    }

    updateScore(match: Piece[]): number {
        let bonusDmg: number = 0;
        if (match[0]?.shape) {
            bonusDmg = match[0].shape.bonusDmg;
            this.sounds['match'].play();
        }

        let criticalInMatch: boolean = match.some((piece: Piece) => piece.critical);

        let lengthMultiplier = match.length;
        if (this.player.hasItem('Hit Streak')) {
            lengthMultiplier += (this.consecutiveCombo + 1);
        }

        let additiveScore: number = (this.player.attack + bonusDmg) * lengthMultiplier * this.player.damageMultiplier;
        additiveScore *= this.player.hasItem('Combos multiply DMG') ? this.combo : 1;
        additiveScore *= criticalInMatch ? this.player.criticalMultiplier : 1;

        this.score += additiveScore;
        //this.controls['scoreCounter'].innerHTML = formatNumber(this.score);

        let bests: BestNumbers = getBestNumbers();
        bests.bestScore = bests.bestScore > this.score ? bests.bestScore : this.score;
        //this.controls['bestScoreCounter'].innerHTML = formatNumber(bests.bestScore);
        setBestNumbers(bests);

        if (match?.length) {
            let cell1: Cell = this.map.grid.getCellbyPosition(match[0].position);
            let cell2: Cell = this.map.grid.getCellbyPosition(match[match.length - 1].position);
            let position: Position = cell1.canvasPosition.average(cell2.canvasPosition);

            this.textAnimationController.damageAnimation(additiveScore, criticalInMatch, position, match[0]?.shape);
            this.updateDamage(additiveScore);
            this.player.xp += match.length * (criticalInMatch ? 2 : 1);
        }

        return additiveScore;
    }

    updateDamage(damageDealt: number): void {
        if (damageDealt === 0) {
            this.damage = 0;
            //this.controls['damageCounter'].setAttribute('style', 'font-size: 1em');
        }

        this.damage += damageDealt;
        //this.controls['damageCounter'].innerHTML = formatNumber(this.damage);

        let bests: BestNumbers = getBestNumbers();
        bests.bestDamage = bests.bestDamage > this.damage ? bests.bestDamage : this.damage;
        //this.controls['bestDamageCounter'].innerHTML = formatNumber(bests.bestDamage);
        setBestNumbers(bests);

        let fontSize: number = this.damage > 0 ? ((this.damage / bests.bestDamage) * 2 >= 1 ? (this.damage / bests.bestDamage) * 2 : 1) : 1;
        //this.controls['damageCounter'].setAttribute('style', 'font-size: ' + fontSize + 'em; ' + (bests.bestDamage === this.damage && this.damage !== 0 ? 'color: red' : 'color: white'));
    }

    damageEnemy(damage: number): void {
        damage = damage * this.player.damageMultiplier;
        let enemy: Enemy = this.map.enemy;
        let finalDamage: number = enemy.simulateDamage(damage);
        this.updateProgressBar(ProgressBarIndexes.ENEMY, ProgressBar.enemyHealthBar(enemy, enemy.currentHealth - finalDamage, this.map.stage.enemies.length), { useCase: 'DamageEnemy', data: { damage: finalDamage, player: this.player } });
    }


    updatePlayerMoves(): void {
        this.inAnimation = true;
        let movesLeft: number = this.player.moves - 1;
        if (Math.random() < this.player.itemData.moveSaver) {
            movesLeft = this.player.moves;
            this.textAnimationController.moveSavedAnimation();
        }
        this.player.updateMoves(movesLeft);
        this.updateMoves();
    }

    reload(): void {
        this.player.updateMoves(this.maxMoves + this.itemData.bonusMoves);
        let damage: DamageData = this.player.simulateDamage(this.map.enemy.attack);

        this.sounds['defeat'].play();
        this.textAnimationController.damagePlayerAnimation(damage);

        this.updateProgressBar(ProgressBarIndexes.HEALTH, ProgressBar.yourHealthBar(this.player.health, this.player.currentHealth - damage.damage), { useCase: 'DamagePlayer', data: damage });
    }

    newNavigationDialog(callback?: (index: number) => void): void {
        let floor: Floor = this.map.floor;
        let options: NavigationDialogOption[] = floor.stages[floor.currentStageIndex].map((stage: EnemyStage, index: number) =>
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

        this.dialogController.dialogs.push(dialog);
    }

    newRandomDropDialog(rarities: string[], callback: () => void): void {
        let itemList: Item[] = Item.generateItemsBasedOnRarity(1, ItemPools.defaultPool(this), rarities, this.player);

        let dialog: Dialog = new Dialog(
            'This Enemy Dropped Something',
            'You may take it',
            ItemDialogOption.itemListToDialogOption(itemList, this, callback),
            DialogType.SKIPPABLE_ITEM,
            callback
        );

        this.dialogController.dialogs.unshift(dialog);
    }

    newPercDialog(callback: () => void): void {
        let itemList: Item[] = Item.generateItemsBasedOnRarity(
            this.itemOptions,
            ItemPools.defaultPool(this),
            ['Rare', 'Epic'],
            this.player
        );

        let dialog: Dialog = new Dialog(
            'Pick an item',
            'Choose one from the options below',
            ItemDialogOption.itemListToDialogOption(itemList, this, callback),
            DialogType.ITEM,
            undefined,
        );

        this.dialogController.dialogs.unshift(dialog);
    }

    newShopDialog(selectCallback: () => void, closeCallback?: () => void): void {
        let itemList: Item[] = Item.generateItemsBasedOnRarity(2, ItemPools.shopPool(this), ['Common', 'Rare', 'Epic'], this.player, true);

        itemList = [ItemPools.fullHealthShopItem(this), ...itemList];

        let dialog: Dialog = new Dialog(
            'Floor item shop',
            'Buy what you can with your gold',
            ItemDialogOption.itemListToDialogOption(itemList, this, selectCallback),
            DialogType.SHOP,
            closeCallback
        );

        this.dialogController.dialogs.unshift(dialog);
    }

    newInitialItemDialog(): void {
        let itemList: Item[] = Item.generateItemsBasedOnRarity(3, ItemPools.defaultPool(this).filter((item: Item) => {
            return item.name !== 'Instant Health';
        }), ['Common'], this.player);

        let dialog: Dialog = new Dialog(
            'Pick a starting item',
            'Make your run different from the last',
            ItemDialogOption.itemListToDialogOption(itemList, this, () => this.emit('InitialItemSelected')),
            DialogType.SKIPPABLE_ITEM,
            () => this.emit('InitialItemSelected')
        );

        this.dialogController.dialogs.push(dialog);
    }

    static newGameDialog(status?: string, score?: number, color?: Color): Dialog {
        let dialogController = DialogController.getInstance();

        let options: DefaultDialogOption[] = [
            new DefaultDialogOption(
                () => {
                    dialogController.emit('DifficultyChosen', {
                        enemies: 5,
                        stages: 3,
                        floors: 3,
                        moves: 10,
                        gridX: 12,
                        gridY: 8,
                        costMultiplier: 1
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
                        moves: 12,
                        gridX: 10,
                        gridY: 8,
                        costMultiplier: 1.5
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
                        moves: 15,
                        gridX: 8,
                        gridY: 6,
                        costMultiplier: 2
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
                        enemies: 1,
                        stages: 1,
                        floors: 3,
                        moves: 10,
                        gridX: 10,
                        gridY: 8,
                        costMultiplier: 1
                    });
                },
                new Color(224, 224, 224),
                'SpeedRun',
            ));
        }

        let subtext: string = !isNaN(score) ? `With a score of ${formatNumber(score)}. Go again?` : 'Select difficulty'

        return new Dialog(
            status ?? 'New Run',
            subtext,
            options,
            DialogType.CHOICE,
            undefined,
            color
        );
    }

}

export interface RunConfig {
    enemies: number;
    stages: number;
    floors: number;
    moves: number;
    gridX: number;
    gridY: number
    costMultiplier: number;
}

export interface BestNumbers {
    bestCombo: number;
    bestScore: number;
    bestDamage: number;
}

export enum ProgressBarIndexes {
    FLOOR,
    STAGE,
    ENEMY,
    HEALTH,
    MOVES
}
