import * as P5 from "p5";
import { formatNumber, getBestNumbers, setBestNumbers } from "../utils/Functions";
import { CanvasInfo } from "./CanvasInfo";
import { Cell } from "./Cell";
import { Character, DamageData } from "./Character";
import { Color } from "./Color";
import { DefaultDialogOption, Dialog, DialogController, RewardDialogOption } from "./Dialog";
import { Effect } from "./Effect";
import { Enemy } from "./Enemy";
import { Floor } from "./Floor";
import { Grid } from "./Grid";
import { Item } from "./Item";
import { Map } from "./Map";
import { Position } from "./Position";
import { ProgressBar } from "./ProgressBar";
import { Reward, RewardPools } from "./Reward";
import { Shape } from "./Shape";
import { EnemyStage } from "./Stage";
import { TextAnimationController } from "./TextAnimation";

export class Run {
    p5: P5;
    character: Character;
    maxMoves: number;
    costMultiplier: number;

    map: Map;
    textAnimationController: TextAnimationController;
    dialogController: DialogController;
    possibleShapes: Shape[];
    possibleEffects: Effect[];
    progressBars: ProgressBar[];

    score: number = 0;
    combo: number = 0;
    damage: number = 0;
    defeatedEnemies: number = 0;
    rewardOptions: number = 3;

    inAnimation: boolean = false;
    stackCombo = false;

    grid: Grid;
    canvas: CanvasInfo;
    sounds: { [key: string]: P5.SoundFile };
    controls: { [key: string]: HTMLElement };
    setupGame: () => void;

    constructor(p5: P5, character: Character, config: RunConfig, textAnimationController: TextAnimationController, dialogController: DialogController) {
        this.p5 = p5;

        this.character = character;
        this.maxMoves = config.moves;
        this.costMultiplier = config.costMultiplier;
        this.character.moves = config.moves;
        this.textAnimationController = textAnimationController;
        this.dialogController = dialogController;

        this.possibleShapes = Shape.defaultShapes();
        this.possibleEffects = [];

        this.map = new Map(config.floors, config.stages, config.enemies, 1, this);
        this.progressBars = this.generateProgressBars();
    }

    win(): void {
        let interval = setInterval(() => {
            if (!this.grid.isUnstable) {
                this.dialogController.clear()
                alert('YOU WON!\nwith a score of: ' + formatNumber(this.score))
                clearInterval(interval);
                this.setupGame();
            }
        }, 50);

    }

    findFloor(): Floor {
        return this.map.floors[this.map.currentFloorIndex];
    }

    findStage(): EnemyStage {
        let floor: Floor = this.findFloor();
        return floor.stages[floor.currentStageIndex];
    }

    findEnemy(): Enemy {
        let stage: EnemyStage = this.findStage();
        return stage.enemies[stage.currentEnemyIndex];
    }

    generateProgressBars(): ProgressBar[] {
        let enemy: Enemy = this.findEnemy();
        let stage: EnemyStage = this.findStage();
        let floor: Floor = this.findFloor();

        let totalEnemies: number = this.map.totalEnemies;

        return [
            new ProgressBar(
                totalEnemies,
                this.defeatedEnemies,
                'Run Progress',
                new Color(224, 224, 224),
                true
            ),
            new ProgressBar(
                this.map.floorCount,
                floor.number,
                'Floor',
                new Color(244, 208, 63),
                true
            ),
            new ProgressBar(
                this.map.stageCount,
                stage.number,
                'Stage',
                new Color(46, 134, 193),
                true
            ),
            new ProgressBar(
                enemy.health,
                enemy.currentHealth,
                enemy.name + ' Health (' + enemy.number + '/' + this.map.enemyCount + ')',
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
        ]
    }
    updateTopProgressBars(): void {
        let newBars: ProgressBar[] = [
            ProgressBar.runBar(this),
            ProgressBar.floorBar(this),
            ProgressBar.stageBar(this),
            ProgressBar.enemyHealthBar(this.findEnemy(), this.findEnemy().currentHealth, this.map.enemyCount)
        ];

        newBars.forEach((progressBar: ProgressBar, index: number) => {
            this.updateProgressBar(index, progressBar);
        });
    }


    updateProgressBar(index: number, newProgressBar: ProgressBar, callback?: () => void): void {

        let difference: number = this.progressBars[index].value - newProgressBar.value;

        if (difference !== 0) {
            this.inAnimation = true
            this.progressBars[index] = newProgressBar;
            this.progressBars[index].animate(difference, () => {
                this.inAnimation = false;
                if (callback) {
                    callback();
                }
            });
        }
    }

    drawProgressBars(): void {
        this.progressBars.forEach((element: ProgressBar, index: number) => {
            element.drawBar(this.p5, index, this);
        });
    }

    processMacthList(matches: Item[][]): void {
        this.updateCombo(matches);
        let totalDamage: number = 0;
        matches.forEach((match: Item[]) => {
            totalDamage += this.updateScore(match);
        });
        this.damageEnemy(totalDamage);
    }

    updateCombo(matches: Item[][]): void {
        if (matches.length === 0) {
            this.combo = 0;
            this.controls['comboCounter'].setAttribute('style', 'font-size: 1em');
        }

        if (this.stackCombo) {
            this.combo += [...matches].length;
            if (this.combo > 1 && this.character.hasReward('Valuable combo')) {
                    this.character.gold++;
                    this.textAnimationController.goldAnimation(1);
                    this.updatePlayerStatsAndRewards();
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

    updateScore(match: Item[]): number {
        let bonusDmg: number = 0
        if (match[0]?.shape) {
            bonusDmg = match[0].shape.bonusDmg;
        }

        let criticalInMatch: boolean = match.some((item: Item) => item.critical);

        let additiveScore: number = (this.character.attack + bonusDmg) * match.length;
        additiveScore *= this.character.hasReward('Combos multiply DMG') ? this.combo : 1;
        additiveScore *= criticalInMatch ? this.character.criticalMultiplier : 1;

        this.score += additiveScore
        this.controls['scoreCounter'].innerHTML = formatNumber(this.score);

        let bests: BestNumbers = getBestNumbers();
        bests.bestScore = bests.bestScore > this.score ? bests.bestScore : this.score;
        this.controls['bestScoreCounter'].innerHTML = formatNumber(bests.bestScore);
        setBestNumbers(bests);

        if (match?.length) {
            let cell1: Cell = this.grid.getCellbyPosition(match[0].position);
            let cell2: Cell = this.grid.getCellbyPosition(match[match.length - 1].position);
            let position: Position = cell1.canvasPosition.average(cell2.canvasPosition);

            this.textAnimationController.damageAnimation(additiveScore, this.findEnemy(), position);
            this.updateDamage(additiveScore);
        }

        return additiveScore;
    }

    updateDamage(damageDealt: number): void {
        if (damageDealt === 0) {
            this.damage = 0
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
        let enemy: Enemy = this.findEnemy()
        let finalDamage: number = enemy.simulateDamage(damage);
        this.updateProgressBar(3, ProgressBar.enemyHealthBar(enemy, enemy.currentHealth - finalDamage, this.map.enemyCount), () => {
            enemy.damage(finalDamage, undefined,
                () => {
                    this.character.gold += enemy.gold;
                    if (enemy.gold > 0) {
                        this.textAnimationController.goldAnimation(enemy.gold);
                    }
                    enemy.gold = 0;

                    if (this.findEnemy()?.number === this.map.enemyCount - 1) {
                        this.textAnimationController.bossFightAnimation();
                    }
                    if (enemy.hasDrop) {
                        this.newRandomDropDialog(() => {
                            this.updateTopProgressBars();
                            this.updatePlayerStatsAndRewards();
                            this.sounds['item'].play();
                            this.nextEnemy();
                        });
                    } else {
                        this.nextEnemy();
                    }
                    this.sounds['enemyDefeat'].play();
                });
        });
    }

    nextEnemy(): void {
        this.map.nextEnemy(this, () => {
            this.defeatedEnemies++;
            this.updateTopProgressBars();
        }, () => {
            if (!this.map.winState) {
                this.character.updateMoves(this.maxMoves);
                this.grid.renew(this)

                this.newPercDialog(() => {
                    this.updateTopProgressBars();
                    this.updatePlayerStatsAndRewards();
                    this.sounds['item'].play();
                })
            }

            this.sounds['bossDefeat'].play()
        }, () => {
            this.updateProgressBar(1, ProgressBar.floorBar(this));

            if (!this.map.winState) {
                this.textAnimationController.newFloorAnimation()
                this.newShopDialog(() => {
                    this.updatePlayerStatsAndRewards()
                    this.sounds['item'].play();
                }, () => {
                    this.dialogController.close();
                    this.updateTopProgressBars();
                })
            }

            this.sounds['newFloor'].play()
        });
    }

    updatePlayerStatsAndRewards(): void {
        if (!this.controls['runInfo'].classList.contains('show')) {
            this.controls['runInfo'].classList.add('show');
        }

        let statsContent: string = '';
        if (this.character) {
            statsContent += '<div class="stats-ui">'

            statsContent += '<div class="stat-3">'
            statsContent += `<strong>Attack:</strong>&nbsp;<span>${formatNumber(this.character.attack)}</span>`
            statsContent += '</div>';

            statsContent += '<div class="stat-3">'
            statsContent += `<strong>Defense:</strong>&nbsp;<span>${this.character.defense}</span>`
            statsContent += '</div>';

            statsContent += '<div class="stat-4">'
            statsContent += `<strong>Gold:</strong>&nbsp;<span>${this.character.gold}</span>`
            statsContent += '</div>';

            statsContent += '</div><div class="stats-ui">';

            statsContent += '<div class="stat-3">'
            statsContent += `<strong>Multiplier:</strong>&nbsp;<span>x${this.character.damageMultiplier}</span>`
            statsContent += '</div>';

            statsContent += '<div class="stat-3">'
            statsContent += `<strong>Critical Multiplier:</strong>&nbsp;<span>x${this.character.criticalMultiplier}</span>`
            statsContent += '</div>';

            statsContent += '<div class="stat-3">'
            statsContent += `<strong>Critical on Grid:</strong>&nbsp;<span>${this.grid.critical}</span>`
            statsContent += '</div>';

            statsContent += '</div>';
        }

        this.controls['statsContainer'].innerHTML = statsContent;

        let rewardsContent: string = '';

        if (this.character?.rewards || this.character?.activeItem) {
            let rewardsToShow = [...this.character.rewards];

            if (this.character?.activeItem) {
                rewardsToShow.unshift(this.character.activeItem);
            }

            rewardsToShow.forEach((reward: Reward, index: number) => {
                if (index % 4 === 0 || index === 0) {
                    rewardsContent += '</div><div class="reward-ui">'
                }

                rewardsContent += `
                <div class="reward-wrap">
                <div class="centered reward rarity-${reward.rarity}">
                <span class="rarity">${reward.rarity}</span>`;

                rewardsContent += reward.price ? `<span class="price">$ ${reward.price}</span><br>` : '<br>';

                rewardsContent += `    
                <h3>${reward.name}</h3>
                <strong>${reward.description}</strong>`

                rewardsContent += reward.isActive ? '<br><input type="button" id="activeItem" value="Activate">' : '';

                rewardsContent +=
                    `</div>
                </div>
                <br>`
            })
            rewardsContent += '</div>';
        }

        this.controls['rewardsContainer'].innerHTML = rewardsContent;

        if (this.character?.activeItem) {
            let activeItemButton: HTMLElement = document.getElementById('activeItem');
            activeItemButton.onclick = (() => {
                this.character.activeItem.effect();
                this.sounds['item'].play();
                this.updatePlayerStatsAndRewards();
            }).bind(this)
        }
    }

    updatePlayerMoves(callback?: () => void, reloadCallback?: () => void): void {
        let movesLeft: number = this.character.moves - 1;
        if (Math.random() < this.character.moveSaver) {
            movesLeft = this.character.moves
            this.textAnimationController.moveSavedAnimation();
        }
        this.character.updateMoves(movesLeft, () => {
            if (callback) {
                callback();
            }
        }, () => {
            this.reload(reloadCallback);
        });
        this.updateProgressBar(5, ProgressBar.yourMovesBar(this.maxMoves, this.character.moves));
        this.updatePlayerStatsAndRewards();
    }

    reload(callback?: () => void): void {
        this.character.updateMoves(this.maxMoves);
        let damage: DamageData = this.character.simulateDamage(this.findEnemy()?.attack);

        this.sounds['defeat'].play();
        this.textAnimationController.damagePlayerAnimation(damage);

        this.updateProgressBar(4, ProgressBar.yourHealthBar(this.character.health, this.character.currentHealth - damage.damage), () => {
            this.character.takeDamage(damage, undefined, () => {
                let finalScore: number = this.score;
                alert('YOU LOST!\nwith a score of: ' + formatNumber(finalScore));
                this.setupGame();
            })
            if (callback) {
                callback();
            }
        });
    }

    newRandomDropDialog(callback: () => void) {
        let rewardList: Reward[] = this.generateRewardsBasedOnRarity(1, RewardPools.defaultPool(this), ['Common', 'Rare']);

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
                        if (callback) {
                            callback();
                        }
                    }
                )
            });

        console.log('rewards', randomRewards)

        let skipOption: DefaultDialogOption = new DefaultDialogOption(
            this.p5, false, new Color(86, 101, 115), () => {
                this.dialogController.close();
            }, 'Skip', '', ''
        )

        let dialog: Dialog = new Dialog(
            this.p5,
            this.canvas,
            'This Enemy Dropped Something',
            'You may take it',
            [...randomRewards, skipOption],
            new Color(40, 40, 40)
        );

        this.dialogController.dialogs.unshift(dialog);
    }


    newPercDialog(callback: () => void) {
        let rewardList: Reward[] = this.generateRewardsBasedOnRarity(this.rewardOptions, RewardPools.defaultPool(this), ['Common', 'Rare', 'Epic']);

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
                        if (callback) {
                            callback();
                        }
                    }
                )
            });

        let dialog: Dialog = new Dialog(
            this.p5,
            this.canvas,
            'Pick a reward',
            'Choose one from the options below',
            randomRewards,
            new Color(40, 40, 40)
        );

        this.dialogController.dialogs.unshift(dialog);
    }

    newShopDialog(selectCallback: () => void, closeCallback?: () => void) {
        let rewardList: Reward[] = this.generateRewardsBasedOnRarity(2, RewardPools.shopPool(this), ['Common', 'Rare', 'Epic']);

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
            this.canvas,
            'Floor reward shop',
            'Buy what you can with your gold',
            randomRewards,
            new Color(40, 40, 40),
            true,
            closeCallback
        )

        this.dialogController.dialogs.unshift(dialog);
    }

    generateRewardsBasedOnRarity(amount: number, pool: Reward[], rarities: string[]): Reward[] {
        let rewardsOfRarity: Reward[][] = [];
        let counts = {}

        for (let i: number = 0; i < amount; i++) {
            let chance = Math.random();

            let chosenPool: Reward[];
            let chosenRarity: string;

            for (let index = 0; index < rarities.length; index++) {
                if (chance < Reward.rarityColors()[rarities[index]].chance || index === rarities.length -1) {
                    chosenRarity = rarities[index];
                    chosenPool = pool.filter((reward: Reward) => reward.rarity === rarities[index]);
                    break
                }
            }

            counts[chosenRarity] = counts[chosenRarity] ? counts[chosenRarity] + 1 : 1;
            rewardsOfRarity.push(chosenPool);
        }

        console.log(counts)

        let rewardList: Reward[] = [];
        rewardsOfRarity.forEach((rewards: Reward[]) => {
            let initialLength: number = rewardList.length;
            do {
                let random: number = Math.floor(Math.random() * rewards.length);

                if (!rewardList.map(mapName).includes(rewards[random].name)) {
                    rewardList.push(rewards[random]);
                } else {
                    let rarityCheck = rewards[0].rarity;
                    if (counts[rarityCheck] >= rewards.length) {
                        rewardList.push(rewards[random]);
                    }
                }
            } while (rewardList.length === initialLength);
        });

        return rewardList;
    }

    static newGameDialog(canvas: CanvasInfo, dialogController: DialogController, selectCallback: (config: RunConfig) => void) {
        let options: DefaultDialogOption[] = [
            new DefaultDialogOption(
                canvas.p5,
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
                canvas.p5,
                false,
                new Color(244, 208, 63),
                () => {
                    let runConfig: RunConfig = {
                        enemies: 8,
                        stages: 5,
                        floors: 5,
                        moves: 12,
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
                canvas.p5,
                false,
                new Color(231, 76, 60),
                () => {
                    let runConfig: RunConfig = {
                        enemies: 10,
                        stages: 8,
                        floors: 8,
                        moves: 15,
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

        if (localStorage.getItem('dev')) {
            options.unshift(new DefaultDialogOption(
                canvas.p5,
                false,
                new Color(224, 224, 224),
                () => {
                    let runConfig: RunConfig = {
                        enemies: 2,
                        stages: 2,
                        floors: 2,
                        moves: 20,
                        gridX: 12,
                        gridY: 8,
                        costMultiplier: 1
                    }
                    selectCallback(runConfig);
                },
                'SpeedRun',
                '',
                ''
            ),)
        }

        let dialog: Dialog = new Dialog(
            canvas.p5,
            canvas,
            'New Run',
            'Select difficulty',
            options,
            new Color(40, 40, 40)
        )

        dialogController.dialogs.push(dialog);
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
    RUN,
    FLOOR,
    STAGE,
    ENEMY,
    MOVES,
    HEALTH
}

function mapRarity(reward: Reward): string {
    return reward.rarity;
}

function mapName(reward: Reward): string {
    return reward.name
}
