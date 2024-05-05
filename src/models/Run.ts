import * as P5 from "p5";
import { CanvasInfo } from "./CanvasInfo";
import { Character } from "./Character";
import { Color } from "./Color";
import { DefaultDialogOption, Dialog, RewardDialogOption } from "./Dialog";
import { Effect } from "./Effect";
import { Enemy } from "./Enemy";
import { Floor } from "./Floor";
import { Grid } from "./Grid";
import { ProgressBar } from "./ProgressBar";
import { Reward, RewardPools } from "./Reward";
import { Shape } from "./Shape";
import { Stage } from "./Stage";

export class Run {
    p5: P5;
    character: Character;
    totalFloors: number;
    stagesPerFloor: number;
    enemyPerStage: number;
    movesPerStage: number;
    costMultiplier: number;

    floors: Floor[];
    possibleShapes: Shape[];
    possibleEffects: Effect[];
    progressBars: ProgressBar[];

    score: number = 0;
    combo: number = 0;
    damage: number = 0;

    currentFloorIndex: number = 0;
    defeatedEnemies: number = 0;
    rewardOptions: number = 3;

    initialAnimation: boolean = true;
    inAnimation: boolean = false;

    initialShuffle: boolean = true;
    stackCombo: boolean = false;

    grid: Grid;
    canvas: CanvasInfo;
    sounds: { [key: string]: P5.SoundFile };

    constructor(p5: P5, character: Character, totalFloors: number, stagesPerFloor: number, enemyPerStage: number, movesPerStage: number, costMultiplier: number) {
        this.p5 = p5;
        this.character = character;
        this.totalFloors = totalFloors;
        this.stagesPerFloor = stagesPerFloor;
        this.enemyPerStage = enemyPerStage;
        this.movesPerStage = movesPerStage;
        this.costMultiplier = costMultiplier;

        this.character.moves = movesPerStage;
        this.possibleShapes = Shape.defaultShapes();
        this.possibleEffects = [];

        this.floors = [...Array(this.totalFloors)].map(
            (floor: Floor, index: number) => {
                return new Floor(index + 1, { ...this });
            }
        );

        this.setupProgressBars();
    }

    get winState(): boolean {
        return this.defeatedEnemies === this.totalFloors * this.stagesPerFloor * this.enemyPerStage;
    }

    setupCanvas(canvas: CanvasInfo) {
        this.canvas = canvas;
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
                new Color(224, 224, 224)
            ),
            new ProgressBar(
                this.totalFloors,
                floor.number,
                'Floor',
                new Color(244, 208, 63)
            ),
            new ProgressBar(
                this.stagesPerFloor,
                stage.number,
                'Stage',
                new Color(46, 134, 193)
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
                new Color(231, 76, 60),
            )
        ]
    }

    drawRunInfo(canvas: CanvasInfo, callback: () => void): void {
        let enemy: Enemy = this.findEnemy();
        let stage: Stage = this.findStage();
        let floor: Floor = this.findFloor();

        if (this.winState) {
            floor = this.floors[this.totalFloors - 1];
            stage = floor.stages[this.stagesPerFloor - 1];
            enemy = stage.enemies[this.enemyPerStage - 1];
        }

        let totalEnemies: number = this.totalFloors * this.stagesPerFloor * this.enemyPerStage;
        let newProgressBars = [
            new ProgressBar(
                totalEnemies,
                this.defeatedEnemies,
                'Run Progress',
                new Color(224, 224, 224)
            ),
            new ProgressBar(
                this.totalFloors,
                floor.number,
                'Floor',
                new Color(244, 208, 63)
            ),
            new ProgressBar(
                this.stagesPerFloor,
                stage.number,
                'Stage',
                new Color(46, 134, 193)
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
                new Color(231, 76, 60),
            ),
        ];

        this.progressBars.forEach((element: ProgressBar, index: number) => {
            let difference: number = element.value - newProgressBars[index].value

            if (difference !== 0) {
                this.inAnimation = true
                this.progressBars[index] = newProgressBars[index];
                this.progressBars[index].animate(difference, callback)
            }

            element.drawBar(this.p5, index, canvas);
        });
    }

    checkUpdateProgress(deathCallback: () => void, stageCallback: () => void, floorCallback: () => void): void {
        let enemy: Enemy = this.findEnemy();
        let stage: Stage = this.findStage();
        let floor: Floor = this.findFloor();

        if (enemy?.currentHealth <= 0) {
            this.defeatedEnemies++;
            stage.currentEnemyIndex++;
            if (deathCallback) {
                deathCallback();
            }
        }

        if (stage?.currentEnemyIndex === this.enemyPerStage) {
            floor.currentStageIndex++
            this.character.moves = this.movesPerStage
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
    }

    newPercDialog(globalDialogs: Dialog[], selectCallback: () => void) {
        let rewardList: Reward[] = this.generateRewardsBasedOnRarity(this.rewardOptions, RewardPools.defaultPool(this));

        let randomRewards: RewardDialogOption[] = rewardList.map(
            (reward: Reward) => {
                return new RewardDialogOption(
                    this.p5,
                    reward,
                    false,
                    Reward.rarityColors()[reward.rarity].color,
                    () => {
                        if (reward.isActive) {
                            this.character.activeItem = reward;
                        } else {
                            reward.effect();
                            this.character.rewards.push(reward);
                        }
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
        );

        globalDialogs.unshift(dialog);
    }

    newShopDialog(globalDialogs: Dialog[], selectCallback: () => void, closeCallback?: () => void) {
        let rewardList: Reward[] = this.generateRewardsBasedOnRarity(2, RewardPools.shopPool(this));

        let randomRewards: RewardDialogOption[] = rewardList.map(
            (reward: Reward) => {
                return new RewardDialogOption(
                    this.p5,
                    reward,
                    false,
                    Reward.rarityColors()[reward.rarity].color,
                    () => {
                        reward.effect();
                        this.character.rewards.push(reward);
                        if (selectCallback) {
                            selectCallback();
                        }
                    }
                )
            });

        let dialog: Dialog = new Dialog(
            this.p5,
            'Floor reward shop',
            'Buy what you can with your gold',
            randomRewards,
            new Color(40, 40, 40),
            true,
            closeCallback
        )

        globalDialogs.unshift(dialog);
    }

    generateRewardsBasedOnRarity(ammount: number, pool: Reward[]): Reward[] {
        let rarities = [];

        for (let i: number = 0; i < ammount; i++) {
            let chance = Math.random();
            if (chance < Reward.rarityColors()['Common'].chance) {
                rarities.push('Common')
            } else if (chance < Reward.rarityColors()['Rare'].chance) {
                rarities.push('Rare')
            } else {
                rarities.push('Epic')
            }
        }

        let rewardList: Reward[];
        do {
            rewardList = [];
            rarities.forEach((rarity: string) => {
                let rewardsOfRarity: Reward[] = pool.filter((reward: Reward) => {
                    if (rarity === 'Epic') {
                        return reward.rarity === 'Epic' || reward.rarity === 'Unique';
                    }
                    return reward.rarity === rarity;
                });
                rewardList.push(rewardsOfRarity[Math.floor(Math.random() * rewardsOfRarity.length)]);
            })
        } while (rewardList.map((reward: Reward) => reward.rarity).filter((rarity: string) => rarity === 'Unique').length > 1);

        return rewardList;
    }

    static newGameDialog(p5: P5, globalDialogs: Dialog[], selectCallback: (config: RunConfig) => void) {
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
                        costMultiplier: 1
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
                        enemies: 8,
                        stages: 5,
                        floors: 5,
                        moves: 10,
                        gridX: 10,
                        gridY: 8,
                        costMultiplier: 1.5
                    }
                    selectCallback(runConfig);
                },
                'Normal',
                '8 Enemies, 5 Stages, 5 Floors',
                '10x8 grid'
            ),
            new DefaultDialogOption(
                p5,
                false,
                new Color(231, 76, 60),
                () => {
                    let runConfig: RunConfig = {
                        enemies: 10,
                        stages: 8,
                        floors: 8,
                        moves: 10,
                        gridX: 8,
                        gridY: 6,
                        costMultiplier: 2
                    }
                    selectCallback(runConfig);
                },
                'Hard',
                '10 Enemies, 8 Stages, 8 Floors',
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