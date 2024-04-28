import * as p5 from "p5";
import { CanvasInfo } from "./CanvasInfo";
import { Character } from "./Character";
import { Color } from "./Color";
import { DefaultDialogOption, Dialog, RewardDialogOption } from "./Dialog";
import { Enemy } from "./Enemy";
import { Floor } from "./Floor";
import { Grid } from "./Grid";
import { ProgressBar } from "./ProgressBar";
import { Reward, RewardPools } from "./Reward";
import { Shape } from "./Shape";
import { Stage } from "./Stage";

export class Run {
    p5: p5;
    character: Character;
    totalFloors: number;
    stagesPerFloor: number;
    enemyPerStage: number;
    movesPerStage: number;
    moves: number;
    score: number;
    combo: number;
    currentFloorIndex: number;
    defeatedEnemies: number;
    winState: boolean;
    inAnimation: boolean;
    possibleShapes = {};
    possibleRewards: Reward[];
    floors: Floor[];
    grid: Grid
    canvas: CanvasInfo;

    initialShuffle: boolean = true;
    stackCombo: boolean = false;

    damageMultiplier: number = 1;
    damageBoost: number = 0;
    moveSaver: number = 0;
    progressBars: ProgressBar[];

    constructor(p5: p5, character: Character, totalFloors: number, stagesPerFloor: number, enemyPerStage: number, movesPerStage: number) {
        this.p5 = p5;
        this.character = character;
        this.totalFloors = totalFloors;
        this.stagesPerFloor = stagesPerFloor;
        this.enemyPerStage = enemyPerStage;
        this.movesPerStage = movesPerStage;

        this.moves = movesPerStage;
        this.score = 0;
        this.combo = 0;
        this.currentFloorIndex = 0;
        this.defeatedEnemies = 0;
        this.winState = false;
        this.inAnimation = false;

        this.possibleShapes = {
            red: new Shape(3, new Color(231, 76, 60)), //red
            green: new Shape(4, new Color(46, 204, 113)), //green
            blue: new Shape(5, new Color(46, 134, 193)), //blue
          //  yellow: new Shape(6, new Color(244, 208, 63)), //yellow
          //  orange: new Shape(7, new Color(243, 156, 18)), //orange
          //  pink: new Shape(8, new Color(240, 98, 146)), //pink
        };

        this.floors = [...Array(this.totalFloors)].map(
            (floor: Floor, index: number) => {
                return new Floor(index + 1, { ...this });
            }
        );

        this.setupProgressBars();
    }

    setupGrid(grid: Grid) {
        this.grid = grid;
    }

    setupCanvas(canvas: CanvasInfo) {
        this.canvas = canvas;
    }

    setupProgressBars(): void {
        let enemy: Enemy = this.findEnemy();
        let stage: Stage = this.findStage();
        let floor: Floor = this.findFloor();

        let totalEnemies: number = this.totalFloors * this.stagesPerFloor * this.enemyPerStage;

        this.progressBars = [
            new ProgressBar(
                totalEnemies,
                this.defeatedEnemies,
                'Run Progress',
                new Color(227, 227, 227)
            ),
            new ProgressBar(
                this.totalFloors,
                floor.number,
                'Floor',
                new Color(236, 200, 19)
            ),
            new ProgressBar(
                this.stagesPerFloor,
                stage.number,
                'Stage',
                new Color(49, 102, 214)
            ),
            new ProgressBar(
                enemy.health,
                enemy.currentHealth,
                enemy.name + ' Health (' + enemy.number + '/' + this.enemyPerStage + ')',
                enemy.isBoss ? new Color(87, 49, 214) : new Color(86, 101, 115)
            ),
            new ProgressBar(
                this.character.health,
                this.character.currentHealth,
                'Your Health',
                new Color(214, 87, 49)
            )
        ]
    }

    findFloor(): Floor {
        return this.floors[this.currentFloorIndex];
    }

    findStage(): Stage {
        let stageIndex: number = this.findFloor()?.currentStageIndex;
        return this.floors[this.currentFloorIndex]?.stages[stageIndex];
    }

    findEnemy(): Enemy {
        let stageIndex: number = this.findFloor()?.currentStageIndex;
        let enemyIndex: number = this.findStage()?.currentEnemyIndex;
        return this.floors[this.currentFloorIndex]?.stages[stageIndex]?.enemies[enemyIndex];
    }

    checkUpdateProgress(stageCallback: () => void, floorCallback: () => void): void {
        let enemy: Enemy = this.findEnemy();
        let stage: Stage = this.findStage();
        let floor: Floor = this.findFloor();

        if (enemy?.currentHealth <= 0) {
            this.defeatedEnemies++;
            stage.currentEnemyIndex++;
        }

        if (stage?.currentEnemyIndex === this.enemyPerStage) {
            floor.currentStageIndex++
            this.moves = this.movesPerStage
            if (stageCallback) {
                stageCallback();
            }
        }

        if (floor?.currentStageIndex === this.stagesPerFloor) {
            this.currentFloorIndex++
            if (floorCallback) {
                floorCallback();
            }
        }

        if (this.currentFloorIndex >= this.totalFloors) {
            this.winState = true
        }
    }

    newPercDialog(globalDialogs: Dialog[], selectCallback: () => void) {
        this.possibleRewards = RewardPools.defaultPool(this);

        let rarityColorMap = {
            'Common': new Color(224, 224, 224),
            'Rare': new Color(101, 206, 80),
            'Epic': new Color(84, 80, 206)
        }

        let randomRewards: RewardDialogOption[] = this.possibleRewards.sort(() => Math.random() - Math.random()).slice(0, 3).map(
            (reward: Reward) => {
                return new RewardDialogOption(
                    this.p5,
                    reward,
                    false,
                    rarityColorMap[reward.rarity],
                    () => {
                        reward.effect();
                        this.character.rewards.push(reward);
                        if (selectCallback) {
                            selectCallback();
                        }
                    }
                )
            })

        let dialog: Dialog = new Dialog(
            this.p5,
            'Pick a reward',
            'Choose one from the options below',
            randomRewards,
            new Color(40, 40, 40)
        )

        globalDialogs.push(dialog);
    }

    static newGameDialog(p5: p5, globalDialogs: Dialog[], selectCallback: (config: RunConfig) => void) {
        let options: DefaultDialogOption[] = [
            new DefaultDialogOption(
                p5,
                false,
                new Color(46, 204, 113),
                () => {
                    let runConfig: RunConfig = {
                        enemies: 5,
                        stages: 3,
                        floors: 3,
                        moves: 10,
                        gridX: 12,
                        gridY: 8,
                    }
                    selectCallback(runConfig);
                },
                'Easy',
                '5 Enemies, 3 Stages, 3 Floors',
                '12x8 grid'
            ),
            new DefaultDialogOption(
                p5,
                false,
                new Color(244, 208, 63),
                () => {
                    let runConfig: RunConfig = {
                        enemies: 5,
                        stages: 5,
                        floors: 5,
                        moves: 10,
                        gridX: 10,
                        gridY: 8,
                    }
                    selectCallback(runConfig);
                },
                'Normal',
                '5 Enemies, 5 Stages, 5 Floors',
                '10x8 grid'
            ),
            new DefaultDialogOption(
                p5,
                false,
                new Color(231, 76, 60),
                () => {
                    let runConfig: RunConfig = {
                        enemies: 10,
                        stages: 10,
                        floors: 8,
                        moves: 10,
                        gridX: 30,
                        gridY: 20,
                    }
                    selectCallback(runConfig);
                },
                'Hard',
                '10 Enemies, 10 Stages, 8 Floors',
                '8x6 grid'
            ),
        ]

        let dialog: Dialog = new Dialog(
            p5,
            'New Run',
            'Select difficulty',
            options,
            new Color(40, 40, 40)
        )

        globalDialogs.push(dialog);
    }

    drawRunInfo(canvas: CanvasInfo): void {
        let enemy: Enemy = this.findEnemy();
        let stage: Stage = this.findStage();
        let floor: Floor = this.findFloor();
        if (enemy && floor && stage) {
            let totalEnemies: number = this.totalFloors * this.stagesPerFloor * this.enemyPerStage;
            let newProgressBars = [
                new ProgressBar(
                    totalEnemies,
                    this.defeatedEnemies,
                    'Run Progress',
                    new Color(227, 227, 227)
                ),
                new ProgressBar(
                    this.totalFloors,
                    floor.number,
                    'Floor',
                    new Color(236, 200, 19)
                ),
                new ProgressBar(
                    this.stagesPerFloor,
                    stage.number,
                    'Stage',
                    new Color(49, 102, 214)
                ),
                new ProgressBar(
                    enemy.health,
                    enemy.currentHealth,
                    enemy.name + ' Health (' + enemy.number + '/' + this.enemyPerStage + ')',
                    enemy.isBoss ? new Color(87, 49, 214) : new Color(86, 101, 115)
                ),
                new ProgressBar(
                    this.character.health,
                    this.character.currentHealth,
                    'Your Health',
                    new Color(214, 87, 49)
                ),
            ];

            this.progressBars.forEach((element: ProgressBar, index: number) => {
                let difference: number = element.value - newProgressBars[index].value
                if (difference !== 0) {
                    this.progressBars[index] = newProgressBars[index];
                    this.progressBars[index].animate(difference);
                }
                element.drawBar(this.p5, index, canvas);
            });
        }
    }

}

export interface RunConfig {
    enemies: number;
    stages: number;
    floors: number;
    moves: number;
    gridX: number;
    gridY: number
}