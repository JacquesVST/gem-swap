import * as P5 from "p5";
import { formatNumber, getBestNumbers, setBestNumbers } from "../utils/Functions";
import { CanvasInfo } from "./CanvasInfo";
import { Cell } from "./Cell";
import { Character, DamageData } from "./Character";
import { Color } from "./Color";
import { DefaultDialogOption, Dialog, DialogController, ItemDialogOption, NavigationDialogOption } from "./Dialog";
import { Effect } from "./Effect";
import { BossEnemy, Enemy, MiniBossEnemy } from "./Enemy";
import { ConfigureListeners, EventEmitter, EventParams } from "./EventEmitter";
import { Floor } from "./Floor";
import { Item, ItemPools } from "./Item";
import { Map } from "./Map";
import { Piece } from "./Piece";
import { Position } from "./Position";
import { ProgressBar } from "./ProgressBar";
import { Shape } from "./Shape";
import { EnemyStage } from "./Stage";
import { TextAnimationController } from "./TextAnimation";

export class Run extends EventEmitter implements ConfigureListeners {
    p5: P5;
    character: Character;
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

    inAnimation: boolean = false;
    stackCombo: boolean = false;

    sounds: { [key: string]: P5.SoundFile };
    controls: { [key: string]: HTMLElement };

    constructor(p5: P5, character: Character, config: RunConfig, sounds: { [key: string]: P5.SoundFile }, controls: { [key: string]: HTMLElement }) {
        super();

        this.p5 = p5;
        this.character = character;
        this.maxMoves = config.moves;
        this.costMultiplier = config.costMultiplier;
        this.character.moves = config.moves;
        this.sounds = sounds;
        this.controls = controls;

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
                this.character.updateMoves(this.maxMoves);
                this.newNavigationDialog();
            }
        });

        this.on('Map:NextFloorReached', () => {
            if (!this.map.winState) {
                this.character.updateMoves(this.maxMoves);
                this.emit('InitGrid', this);
            }
        });

        this.on('Map:ResumeRun', () => {
            this.updateTopProgressBars();
            this.updateMoves();
            this.updatePlayerStatsAndItems();

            this.character.updateMoves(this.maxMoves);
            this.emit('InitGrid', this);
        });

        this.on('Run:InitialItemSelected', () => {
            this.updateScore([]);
            this.updateCombo([]);
            this.updateDamage(0);

            this.updatePlayerStatsAndItems();
            this.updateMoves();
            this.updateHealth();

            this.emit('InitGrid', this);
        });

        this.on('ProgressBar:ProgressBarUpdated:DamagePlayer', (data: DamageData) => {
            this.character.damage(data);
        });

        // Grid events

        this.on('Grid:GridStabilized:Death', () => {
            let enemy: Enemy = this.map.enemy;
            this.character.gold += enemy.gold;
            if (enemy.gold > 0) {
                this.textAnimationController.goldAnimation(enemy.gold);
                enemy.gold = 0;
            }

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
                    this.updatePlayerStatsAndItems();

                    this.sounds['item'].play();
                    this.emit('Next');
                });
            } else {
                this.emit('Next');
            }
        });

        this.on('Grid:MoveDone', () => {
            this.emit('ApplyCritical', this.character.critical + (this.map.isBoss ? this.character.bossCritical : 0));
            this.consecutiveCombo = this.combo === 0 ? 0 : this.consecutiveCombo + 1;
            if (this.character.movesEnded) {
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
            this.emit('ApplyCritical', this.character.critical + (this.map.isBoss ? this.character.bossCritical : 0));
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
                    this.updatePlayerStatsAndItems();
                }, () => {
                    this.updateTopProgressBars();
                    this.updateHealth();
                    this.updateMoves();
                    this.updatePlayerStatsAndItems();

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
                this.character.health,
                this.character.currentHealth,
                'Your Health',
                new Color(231, 76, 60),
                false
            ),
            new ProgressBar(
                this.character.moves,
                this.maxMoves,
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
        this.updateProgressBar(ProgressBarIndexes.HEALTH, ProgressBar.yourHealthBar(this.character.health, this.character.currentHealth));
    }

    updateMoves(): void {
        this.updateProgressBar(ProgressBarIndexes.MOVES, ProgressBar.yourMovesBar(this.maxMoves, this.character.moves));
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
    }

    processMacthList(matches: Piece[][]): void {
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
            this.controls['comboCounter'].setAttribute('style', 'font-size: 1em');
        }

        if (this.stackCombo) {
            this.combo += [...matches].length;
            if (this.combo > 1 && this.character.hasItem('Valuable combo')) {
                let goldAmount: number = 1;
                this.character.gold += goldAmount;
                this.textAnimationController.goldAnimation(goldAmount);
                this.updatePlayerStatsAndItems();
            }
        }
        this.controls['comboCounter'].innerHTML = formatNumber(this.combo);

        let bests: BestNumbers = getBestNumbers();
        bests.bestCombo = bests.bestCombo > this.combo ? bests.bestCombo : this.combo;
        this.controls['bestComboCounter'].innerHTML = formatNumber(bests.bestCombo);
        setBestNumbers(bests);

        let fontSize: number = this.combo > 0 ? ((this.combo / bests.bestCombo) * 2 >= 1 ? (this.combo / bests.bestCombo) * 2 : 1) : 1;
        this.controls['comboCounter'].setAttribute('style', 'font-size: ' + fontSize + 'em; ' + (bests.bestCombo === this.combo && this.combo !== 0 ? 'color: red' : 'color: white'));
    }

    updateScore(match: Piece[]): number {
        let bonusDmg: number = 0;
        if (match[0]?.shape) {
            bonusDmg = match[0].shape.bonusDmg;
            this.sounds['match'].play();
        }

        let criticalInMatch: boolean = match.some((piece: Piece) => piece.critical);

        let lengthMultiplier = match.length;
        if (this.character.hasItem('Hit Streak')) {
            lengthMultiplier += this.consecutiveCombo;
        }

        let additiveScore: number = (this.character.attack + bonusDmg) * lengthMultiplier;
        additiveScore *= this.character.hasItem('Combos multiply DMG') ? this.combo : 1;
        additiveScore *= criticalInMatch ? this.character.criticalMultiplier : 1;

        this.score += additiveScore;
        this.controls['scoreCounter'].innerHTML = formatNumber(this.score);

        let bests: BestNumbers = getBestNumbers();
        bests.bestScore = bests.bestScore > this.score ? bests.bestScore : this.score;
        this.controls['bestScoreCounter'].innerHTML = formatNumber(bests.bestScore);
        setBestNumbers(bests);

        if (match?.length) {
            let cell1: Cell = this.map.grid.getCellbyPosition(match[0].position);
            let cell2: Cell = this.map.grid.getCellbyPosition(match[match.length - 1].position);
            let position: Position = cell1.canvasPosition.average(cell2.canvasPosition);

            this.textAnimationController.damageAnimation(additiveScore, position, match[0]?.shape);
            this.updateDamage(additiveScore);
        }

        return additiveScore;
    }

    updateDamage(damageDealt: number): void {
        if (damageDealt === 0) {
            this.damage = 0;
            this.controls['damageCounter'].setAttribute('style', 'font-size: 1em');
        }

        this.damage += damageDealt;
        this.controls['damageCounter'].innerHTML = formatNumber(this.damage);

        let bests: BestNumbers = getBestNumbers();
        bests.bestDamage = bests.bestDamage > this.damage ? bests.bestDamage : this.damage;
        this.controls['bestDamageCounter'].innerHTML = formatNumber(bests.bestDamage);
        setBestNumbers(bests);

        let fontSize: number = this.damage > 0 ? ((this.damage / bests.bestDamage) * 2 >= 1 ? (this.damage / bests.bestDamage) * 2 : 1) : 1;
        this.controls['damageCounter'].setAttribute('style', 'font-size: ' + fontSize + 'em; ' + (bests.bestDamage === this.damage && this.damage !== 0 ? 'color: red' : 'color: white'));
    }

    damageEnemy(damage: number): void {
        damage = damage * this.character.damageMultiplier;
        let enemy: Enemy = this.map.enemy;
        let finalDamage: number = enemy.simulateDamage(damage);
        this.updateProgressBar(ProgressBarIndexes.ENEMY, ProgressBar.enemyHealthBar(enemy, enemy.currentHealth - finalDamage, this.map.stage.enemies.length), { useCase: 'DamageEnemy', data: finalDamage });
    }

    updatePlayerStatsAndItems(): void {
        if (!this.controls['runInfo'].classList.contains('show')) {
            this.controls['runInfo'].classList.add('show');
        }

        let statsContent: string = '';
        if (this.character) {
            statsContent += '<div class="stats-ui">';

            statsContent += '<div class="stat-3">';
            statsContent += `<strong>Attack:</strong>&nbsp;<span>${formatNumber(this.character.attack)}</span>`;
            statsContent += '</div>';

            statsContent += '<div class="stat-3">';
            statsContent += `<strong>Defense:</strong>&nbsp;<span>${this.character.defense}</span>`;
            statsContent += '</div>';

            statsContent += '<div class="stat-4">';
            statsContent += `<strong>Gold:</strong>&nbsp;<span>${this.character.gold}</span>`;
            statsContent += '</div>';

            statsContent += '</div><div class="stats-ui">';

            statsContent += '<div class="stat-3">';
            statsContent += `<strong>Multiplier:</strong>&nbsp;<span>x${this.character.damageMultiplier}</span>`;
            statsContent += '</div>';

            statsContent += '<div class="stat-3">';
            statsContent += `<strong>Critical Multiplier:</strong>&nbsp;<span>x${this.character.criticalMultiplier}</span>`;
            statsContent += '</div>';

            statsContent += '<div class="stat-3">';
            statsContent += `<strong>Critical on Grid:</strong>&nbsp;<span>${this.character.critical}</span>`;
            statsContent += '</div>';

            statsContent += '</div>';
        }

        this.controls['statsContainer'].innerHTML = statsContent;

        let itemsContent: string = '';

        if (this.character?.items || this.character?.activeItem) {
            let itemsToShow = [...this.character.items];

            if (this.character?.activeItem) {
                itemsToShow.unshift(this.character.activeItem);
            }

            itemsToShow.forEach((item: Item, index: number) => {
                if (index % 4 === 0 || index === 0) {
                    itemsContent += '</div><div class="item-ui">';
                }

                itemsContent += `
                <div class="item-wrap">
                <div class="centered item rarity-${item.rarity}">
                <span class="rarity">${item.rarity}</span>`;


                if (item.price || item.unique) {

                    itemsContent += item.price ? `<span class="price">$ ${item.price}</span><br>` : '';
                    itemsContent += item.unique ? `<span class="unique">Unique</span><br>` : '';

                } else {
                    itemsContent += '<br>';
                }

                itemsContent += `   
                <h3>${item.name}</h3>
                <strong>${item.description}</strong>`

                itemsContent += item.isActive ? '<br><input type="button" id="activeItem" value="Activate">' : '';

                itemsContent += '</div></div> <br>';
            });
            itemsContent += '</div>';
        }

        this.controls['itemsContainer'].innerHTML = itemsContent;

        if (this.character?.activeItem) {
            let activeItemButton: HTMLElement = document.getElementById('activeItem');
            activeItemButton.onclick = (() => {
                this.character.activeItem.effect();
                this.character.activeItem = undefined;
                this.sounds['item'].play();
                this.updatePlayerStatsAndItems();
            }).bind(this);
        }
    }

    updatePlayerMoves(): void {
        this.inAnimation = true;
        let movesLeft: number = this.character.moves - 1;
        if (Math.random() < this.character.moveSaver) {
            movesLeft = this.character.moves;
            this.textAnimationController.moveSavedAnimation();
        }
        this.character.updateMoves(movesLeft);
        this.updateMoves();
        this.updatePlayerStatsAndItems();
    }

    reload(): void {
        this.character.updateMoves(this.maxMoves);
        let damage: DamageData = this.character.simulateDamage(this.map.enemy.attack);

        this.sounds['defeat'].play();
        this.textAnimationController.damagePlayerAnimation(damage);

        this.updateProgressBar(ProgressBarIndexes.HEALTH, ProgressBar.yourHealthBar(this.character.health, this.character.currentHealth - damage.damage), { useCase: 'DamagePlayer', data: damage });
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
            new Color(255, 255, 255)
        );

        this.dialogController.dialogs.push(dialog);
    }

    newRandomDropDialog(rarities: string[], callback: () => void): void {
        let itemList: Item[] = Item.generateItemsBasedOnRarity(1, ItemPools.defaultPool(this), rarities, this.character);

        let dialog: Dialog = new Dialog(
            'This Enemy Dropped Something',
            'You may take it',
            ItemDialogOption.itemListToDialogOption(itemList, this, callback),
            new Color(255, 255, 255),
            false,
            true,
            callback
        );

        this.dialogController.dialogs.unshift(dialog);
    }

    newPercDialog(callback: () => void): void {
        let itemList: Item[] = Item.generateItemsBasedOnRarity(
            this.itemOptions,
            ItemPools.defaultPool(this),
            ['Common', 'Rare', 'Epic'],
            this.character
        );

        let dialog: Dialog = new Dialog(
            'Pick a item',
            'Choose one from the options below',
            ItemDialogOption.itemListToDialogOption(itemList, this, callback),
            new Color(255, 255, 255)
        );

        this.dialogController.dialogs.unshift(dialog);
    }

    newShopDialog(selectCallback: () => void, closeCallback?: () => void): void {
        let itemList: Item[] = Item.generateItemsBasedOnRarity(2, ItemPools.shopPool(this), ['Common', 'Rare', 'Epic'], this.character);

        itemList = [ItemPools.fullHealthShopItem(this), ...itemList];

        let dialog: Dialog = new Dialog(
            'Floor item shop',
            'Buy what you can with your gold',
            ItemDialogOption.itemListToDialogOption(itemList, this, selectCallback),
            new Color(255, 255, 255),
            true,
            false,
            closeCallback
        );

        this.dialogController.dialogs.unshift(dialog);
    }

    newInitialItemDialog(): void {
        let itemList: Item[] = Item.generateItemsBasedOnRarity(3, ItemPools.defaultPool(this).filter((item: Item) => {
            return item.name !== 'Instant Health';
        }), ['Common'], this.character);

        let dialog: Dialog = new Dialog(
            'Pick a starting piece',
            'Make your run different from the last or not',
            ItemDialogOption.itemListToDialogOption(itemList, this, () => this.emit('InitialItemSelected')),
            new Color(255, 255, 255),
            false,
            true,
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
                '5 Enemies, 3 Stages, 3 Floors',
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
                '8 Enemies, 5 Stages, 5 Floors',
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
                '10 Enemies, 8 Stages, 8 Floors',
                '8x6 grid'
            ),
        ];

        if (localStorage.getItem('dev')) {
            options.unshift(new DefaultDialogOption(
                () => {
                    dialogController.emit('DifficultyChosen', {
                        enemies: 1,
                        stages: 1,
                        floors: 1,
                        moves: 2,
                        gridX: 7,
                        gridY: 5,
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
            color ?? new Color(255, 255, 255)
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
