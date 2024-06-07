import { DialogController } from "../controllers/DialogController";
import { EventEmitter } from "../controllers/EventEmitter";
import { IMap } from "../interfaces";
import { Cell } from "./Cell";
import { DialogOption, NavigationDialogOption } from "./Dialog";
import { EffectParams } from "./Effect";
import { BossEnemy, Enemy } from "./Enemy";
import { Floor } from "./Floor";
import { Grid } from "./Grid";
import { Limits } from "./Limits";
import { FallPieceAnimationParams, Piece, RemovePieceAnimationParams, SwapPieceAnimationParams } from "./Piece";
import { Position } from "./Position";
import { Run, RunConfig } from "./Run";
import { CommonEnemyStage, EnemyStage, ItemStage, ShopStage, Stage } from "./Stage";

export class Map extends EventEmitter implements IMap {
    floorCount: number;
    stageCount: number;
    enemyCount: number;
    gridX: number;
    gridY: number;
    run: Run;

    winState: boolean;
    floors: Floor[];
    currentFloorIndex: number;

    constructor(config: RunConfig, run: Run) {
        super('Map');
        this.floorCount = config.floors;
        this.stageCount = config.stages;
        this.enemyCount = config.enemies;

        if (config?.item?.name === 'No barriers') {
            config.gridX += 1;
            config.gridY += 1;
        }

        if (config?.item?.name === 'Less Is More') {
            config.gridX -= 1;
            config.gridY -= 1;
        }

        this.gridX = config.gridX;
        this.gridY = config.gridY;
        this.run = run;

        this.currentFloorIndex = 0;
        this.floors = this.setupFloors();

        this.configureListeners();
    }

    configureListeners(): void {

        // Other events
        this.on('ProgressBar:ProgressBarUpdated:DamageEnemy', (data: any) => {
            this.enemy.damage(data.damage);
        });

        this.on('Run:Next', () => {
            this.next();
        });

        this.on('Run:AllowNextStage', () => {
            this.nextStage();
        });

        this.on('Run:AllowNextFloor', () => {
            this.nextFloor();
        });

        this.on('DialogController:OptionSelected', (option: DialogOption, id: string) => {
            if (option instanceof NavigationDialogOption) {
                this.setStageBranch(option.index);
                this.stage.initStage(this.gridX, this.gridY);
                DialogController.getInstance().close(id);
                this.emit('ResumeRun', this.stage);
            }
        });

        // Grid events

        this.on('Run:InitGrid', (run: Run) => {
            this.grid.init(run);
        });

        this.on('Run:ApplyCritical', (amount: number) => {
            this.grid.applyCriticalInGrid(amount);
        });

        this.on('Piece:FallAnimationEnded:Init', (params: FallPieceAnimationParams) => {
            this.grid.pullPieceDown(params);
        });

        // Click usecase

        this.on('Main:MouseClicked', (click: Position, run?: Run) => {
            if (!run || run.hasDialogOpen || run.player.hasInventoryOpen) {
                return;
            }

            if (!this.grid.isFull || this.grid.isUnstable) {
                this.grid.emit('SwapValidated', false);
                return;
            }

            this.grid.setRunSnapshot(run);
            let clickFound: boolean;
            this.grid.iterateXtoY((position: Position) => {
                const cell: Cell = this.grid.getCellbyPosition(position);
                const limits: Limits = new Limits(Position.of(cell.canvasPosition.x, cell.canvasPosition.y), Position.of(cell.canvasPosition.x + this.grid.sideSize, cell.canvasPosition.y + this.grid.sideSize))

                if (limits.contains(click)) {
                    clickFound = true;
                    if (!this.grid.selectedCellPosition) {
                        this.grid.emit('FirstClickFound', position);
                        this.grid.selectedCellPosition = position;
                    } else {
                        this.grid.emit('SecondClickFound', position);
                        this.grid.playerSwap(position, this.grid.selectedCellPosition.addX(0));
                        this.grid.selectedCellPosition = undefined;
                    }
                }
            }, () => clickFound, () => clickFound);
            if (!clickFound) {
                this.grid.selectedCellPosition = undefined;
            }
        });

        this.on('Grid:SwapValidated', () => {
            this.grid.selectedCellPosition = undefined
        });

        this.on('Piece:SwapAnimationEnded', (params: SwapPieceAnimationParams) => {
            if (params.data.callNextAction) {
                this.grid.swap(params.data.swapData);
            }
        });

        this.on('Grid:MatchesFound:Swap', (matches: Piece[][]) => {
            if (matches?.length) {
                this.grid.isUnstable = true;
                this.grid.removeMatches(matches, 'Loop');
            } else {
                this.grid.emit('MoveDone');
            }
        });

        this.on('Grid:MatchesFound:Loop', (matches: Piece[][]) => {
            if (matches?.length) {
                this.grid.removeMatches(matches, 'Loop');
            } else {
                this.grid.emit('MoveDone');
            }
        });

        this.on('Piece:RemoveAnimationEnded:Loop', (params: RemovePieceAnimationParams) => {
            this.grid.removePiece('Loop', params.data);
        });

        this.on('Enemy:EnemyDamaged', () => {
            this.grid.stabilizeGrid('Loop', true);
        });

        this.on('Piece:FallAnimationEnded:Loop', (params: FallPieceAnimationParams) => {
            this.grid.pullPieceDown(params);
        });

        this.on('Grid:GridStabilized:Loop', () => {
            this.grid.findMatches('Loop', true);
        });

        // Stage methods

        this.on('Enemy:EnemyDied', () => {
            this.grid.stabilizeGrid('Death', true);
        });

        this.on('Player:PlayerDied', () => {
            this.grid.clearGrid('GridCleared:PlayerDied');
        });

        this.on('Piece:FallAnimationEnded:Death', (params: FallPieceAnimationParams) => {
            this.grid.pullPieceDown(params);
        });

        this.on('Piece:RemoveAnimationEnded:GridCleared:NextStage', (params: RemovePieceAnimationParams) => {
            this.grid.removePiece('GridCleared:NextStage', params.data);
        });

        this.on('Piece:RemoveAnimationEnded:GridCleared:NextFloor', (params: RemovePieceAnimationParams) => {
            this.grid.removePiece('GridCleared:NextFloor', params.data);
        });

        this.on('Piece:RemoveAnimationEnded:GridCleared:MapEnded', (params: RemovePieceAnimationParams) => {
            this.grid.removePiece('GridCleared:MapEnded', params.data);
        });

        this.on('Piece:RemoveAnimationEnded:GridCleared:PlayerDied', (params: RemovePieceAnimationParams) => {
            this.grid.removePiece('GridCleared:PlayerDied', params.data);
        });

        // Items

        this.on('Run:BanShape', (id: string, run: Run) => {
            this.grid.setRunSnapshot(run);
            this.grid.eliminateShape(id);
        });

        this.on('Run:Item:EliminateShape', (id: string) => {
            if (this.grid.isFull) {
                this.grid.eliminateShape(id);
            }
        });

        this.on('Run:Item:ClearRow', (params: EffectParams) => {
            this.grid.clearRow(params);
        });

        this.on('Run:Item:ClearColumn', (params: EffectParams) => {
            this.grid.clearColumn(params);
        });

        this.on('Run:Item:Money', (params: EffectParams) => {
            this.grid.removeMatches(this.grid.sanitizeMatches(params.matches), 'Loop');
        });

        this.on('Main:WindowResized', () => {
            this.grid.calculateSpacing();
        });
    }

    get isBoss(): boolean {
        return this.enemy instanceof BossEnemy;
    }

    get floor(): Floor {
        return this.floors[this.currentFloorIndex];
    }

    get stage(): Stage {
        const floor: Floor = this.floor;
        if (floor) {
            return floor.stages[floor.currentStageIndex][floor.currentStageBranch];
        }
        return undefined;
    }

    get grid(): Grid {
        const stage: Stage = this.stage;
        if (stage) {
            return stage.grid;
        }
        return undefined;
    }

    get enemy(): Enemy {
        const stage: Stage = this.stage;
        if (stage && stage instanceof EnemyStage) {
            return stage.enemies[stage.currentEnemyIndex];
        }
        return undefined;
    }

    debugEnemies() {
        if (!!localStorage.getItem('dev')) {


            console.log('Map')
            this.floors.forEach((floor: Floor, iFloor: number) => {
                console.log('Floor', iFloor + 1)
                let floorEnemies = [];
                floor.stages.forEach((stages: Stage[], iStages: number) => {
                    console.log('Floor', iFloor + 1, ',', iStages + 1, 'Options')
                    stages.forEach((stage: Stage, iStage: number) => {
                        console.log('Stage Option', iStage + 1)
                        if (stage instanceof ShopStage) {
                            console.log('Shop Stage')
                        }

                        if (stage instanceof ItemStage) {
                            console.log('item Stage')
                        }

                        if (stage instanceof EnemyStage) {
                            let enemies = []
                            stage.enemies.forEach((enemy: Enemy) => {
                                let simpleEnemy = { n: enemy.name, h: enemy.maxHealth, a: enemy.attack, s: iStages + 1 }
                                enemies.push(simpleEnemy)
                                floorEnemies.push(simpleEnemy)
                            });
                            console.table(enemies)
                            console.log('Average Health:', this.averageProperty(enemies, "h"), 'Average Attack:', this.averageProperty(enemies, "a"))
                        }
                    })
                })
                console.table(floorEnemies)
                console.log('Average Health:', this.averageProperty(floorEnemies, "h"), 'Average Attack:', this.averageProperty(floorEnemies, "a"))
            })
        }
    }

    averageProperty(arr, prop) {
        const sum = arr.reduce((total, obj) => total + obj[prop], 0);
        return sum / arr.length;
    }


    findNextEnemy(): Enemy {
        const stage: Stage = this.stage;
        if (stage && stage instanceof EnemyStage && stage.currentEnemyIndex < stage.enemies.length - 1) {
            return stage.enemies[stage.currentEnemyIndex + 1];
        };
        return undefined;
    }

    setupFloors(): Floor[] {
        const floors: Floor[] = [...Array(this.floorCount)].map(
            (_: Floor, index: number) => {
                let floor: Floor = new Floor(index + 1, { ...this });
                floor.setupStages(this.stageCount, this.enemyCount);
                return floor;
            }
        );
        (floors[0].stages[0][0] as CommonEnemyStage).initStage(this.gridX, this.gridY);
        return floors;
    }

    setStageBranch(index: number): void {
        this.floors[this.currentFloorIndex].currentStageBranch = index;
    }

    next(): void {
        if (this.stage && this.stage instanceof EnemyStage) {
            if (this.enemy && this.enemy.number === this.stage.enemies.length) {
                if (this.stage && this.stage.number === this.floor.stages.length) {
                    if (this.floor && this.floor.number === this.floors.length) {
                        this.grid.clearGrid('GridCleared:MapEnded');
                    } else {
                        this.grid.clearGrid('GridCleared:NextFloor');
                    }
                } else {
                    this.grid.clearGrid('GridCleared:NextStage');
                }
            } else {
                this.stage.currentEnemyIndex++;
                this.emit('NextEnemyReached', this.enemy);
                this.grid.findMatches('Loop', true);
            }
        }
    }

    nextStage(): void {
        if (this.stage && this.stage.number <= this.floor.stages.length) {
            this.floor.currentStageIndex++;
            this.floor.currentStageBranch = 0
            this.stage.initStage(this.gridX, this.gridY);
            this.emit('NextStageReached');
        }
    }

    nextFloor(): void {
        if (this.floor && this.floor.number <= this.floors.length) {
            this.currentFloorIndex++;
            this.stage.initStage(this.gridX, this.gridY);
            this.emit('NextFloorReached');
        }
    }

}