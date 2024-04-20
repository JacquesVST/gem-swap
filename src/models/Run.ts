import * as p5 from "p5";
import { CanvasInfo } from "./CanvasInfo";
import { Character } from "./Character";
import { Color } from "./Color";
import { Dialog } from "./Dialog";
import { DialogOption } from "./DialogOption";
import { Enemy } from "./Enemy";
import { Floor } from "./Floor";
import { ProgressBar } from "./ProgressBar";
import { Reward } from "./Reward";
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
    possibleColors: Color[];
    possibleRewards: Reward[];
    floors: Floor[];
    runInfo: ProgressBar[];

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

        this.possibleColors = [
            new Color(231, 76, 60), //red
            new Color(46, 204, 113), //green
            new Color(46, 134, 193), //blue
            new Color(244, 208, 63), //yellow
            new Color(243, 156, 18), //orange
            new Color(240, 98, 146), //pink
        ];

        this.floors = [...Array(this.totalFloors)].map(
            (floor: Floor, index: number) => {
                return new Floor(index + 1, { ...this });
            }
        );

        this.possibleRewards = this.defaultPool();
    }

    findFloor(): Floor {
        return this.floors[this.currentFloorIndex];
    }

    findStage(): Stage {
        let stageIndex: number = this.findFloor().currentStageIndex;
        return this.floors[this.currentFloorIndex].stages[stageIndex];
    }

    findEnemy(): Enemy {
        let stageIndex: number = this.findFloor().currentStageIndex;
        let enemyIndex: number = this.findStage().currentEnemyIndex;
        return this.floors[this.currentFloorIndex].stages[stageIndex].enemies[enemyIndex];
    }

    checkUpdateProgress(stageCallback: () => void, floorCallback: () => void): void {
        let enemy: Enemy = this.findEnemy();
        let stage: Stage = this.findStage();
        let floor: Floor = this.findFloor();

        if (enemy.currentHealth <= 0) {

            if (floor.number < this.totalFloors) {
                if (stage.number < this.stagesPerFloor) {
                    if (enemy.number < this.enemyPerStage) {
                        stage.currentEnemyIndex++;
                        this.defeatedEnemies++;
                    } else {
                        floor.currentStageIndex++;
                        if (stageCallback) {
                            stageCallback();
                        }
                    }
                } else {
                    this.currentFloorIndex++;
                    if (floorCallback) {
                        floorCallback();
                    }
                }
            } else {
                this.winState = true;
            }
        }
    }

    newPercDialog(globalDialogs: Dialog[]) {
        let rarityColorMap = {
            'Common': new Color(224, 224, 224),
            'Rare': new Color(101, 206, 80),
            'Epic': new Color(84, 80, 206)
        }

        let randomRewards: DialogOption[] = this.possibleRewards.sort(() => Math.random() - Math.random()).slice(0, 3).map(
            (reward: Reward) => {
                return new DialogOption(
                    this.p5,
                    reward,
                    false,
                    rarityColorMap[reward.rarity],
                    reward.effect,
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

    drawRunInfo(canvas: CanvasInfo, drawBarCallback: (x: ProgressBar, y: number, z: CanvasInfo) => void): void {
        let enemy: Enemy = this.findEnemy();
        let stage: Stage = this.findStage();
        let floor: Floor = this.findFloor();

        let totalEnemies: number = this.totalFloors * this.stagesPerFloor * this.enemyPerStage;
        this.runInfo = [
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
                this.enemyPerStage,
                enemy.number,
                'Enemies',
                new Color(122, 214, 49)
            ),
            new ProgressBar(
                enemy.health,
                enemy.currentHealth,
                enemy.name + ' Health',
                new Color(87, 49, 214)
            ),
            new ProgressBar(
                this.character.health,
                this.character.currentHealth,
                'Your Health',
                new Color(214, 87, 49)
            ),
        ];

        this.runInfo.forEach((element: ProgressBar, index: number) => {
            drawBarCallback(element, index, canvas);
        });
    }

    defaultPool(): Reward[] {
        return [
            new Reward(
                'Common',
                'your average item #1',
                '+1 move(s)',
                (() => {
                    this.movesPerStage += 1;
                }).bind(this)
            ),
            new Reward(
                'Common',
                'your average item #2',
                '+1 move(s)',
                (() => {
                    this.movesPerStage += 1
                }).bind(this)
            ),
            new Reward(
                'Rare',
                'your average item #3',
                '+2 move(s)',
                (() => {
                    this.movesPerStage += 2
                }).bind(this)
            ),
            new Reward(
                'Epic',
                'your average item #4',
                '+4 move(s)',
                (() => {
                    this.movesPerStage += 4
                }).bind(this)
            )
        ]
    }
}
