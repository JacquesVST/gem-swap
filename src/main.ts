import * as p5 from "p5";
import { CanvasInfo } from "./models/CanvasInfo";
import { Cell } from "./models/Cell";
import { Character } from "./models/Character";
import { Color } from "./models/Color";
import { Dialog, DialogOption } from "./models/Dialog";
import { Enemy } from "./models/Enemy";
import { AnimateSwapData, Grid } from "./models/Grid";
import { Item } from "./models/Item";
import { Position } from "./models/Position";
import { Reward } from "./models/Reward";
import { Run, RunConfig } from "./models/Run";
import { TextAnimation } from "./models/TextAnimation";
import { checkPositionInLimit, formatNumber } from "./utils/Functions";

let resetButton: HTMLElement = document.getElementById('resetBtn');
let scoreCounter: HTMLElement = document.getElementById('scoreCounter');
let bestScoreCounter: HTMLElement = document.getElementById('bestScoreCounter');
let comboCounter: HTMLElement = document.getElementById('comboCounter');
let bestComboCounter: HTMLElement = document.getElementById('bestComboCounter');
let damageCounter: HTMLElement = document.getElementById('damageCounter');
let bestDamageCounter: HTMLElement = document.getElementById('bestDamageCounter');
let runInfo: HTMLElement = document.getElementById('runInfo');
let statsContainer: HTMLElement = document.getElementById('statsContainer');
let rewardsContainer: HTMLElement = document.getElementById('rewardsContainer');

new p5((sketch: p5) => {

    let bestScore: number = 0;
    let bestCombo: number = 0;
    let bestDamage: number = 0;
    let currentDialog: Dialog | undefined;

    let run: Run;
    let canvas: CanvasInfo;
    let textAnimations: TextAnimation[] = [];
    let dialogs: Dialog[] = [];

    let initialAnimation: boolean = true;

    sketch.setup = () => {
        canvas = new CanvasInfo(sketch, 16, 4, 4, 20, 5);
        sketch.textFont('Open Sans')

        resetButton.onclick = () => {
            setupGame();
        }

        setupGame();
    }

    function setupGame(): void {
        if (run) {
            run.winState = false
        }
        Run.newGameDialog(sketch, dialogs, (config: RunConfig) => {
            initialAnimation = true;
            run = new Run(sketch, Character.defaultCharacter(), config.floors, config.stages, config.enemies, config.moves)
            run.grid = new Grid(config.gridX, config.gridY);
            run.setupCanvas(canvas);
            run.grid.calculateSpacing(canvas);

            textAnimations = [];
            run.inAnimation = false
            currentDialog = undefined;

            updateScore([], true);
            updateCombo([], true);
            updateDamage(0, true);

            //clear board before drawing

            let iterations: number = 50;
            let intervalWithCallback = (duration: number, callback: () => void) => {
                let count: number = 0;
                let interval = setInterval(() => {
                    if (!run.grid.isFull()) {
                        applyGravity(run.grid, false);
                        run.grid.generateItems(run);
                    } else {
                        removeMatches(findMatches(run.grid), false);
                    }
                    count++
                    if (count === duration) {
                        clearInterval(interval)
                        callback();
                    }
                }, 1);
            }

            intervalWithCallback(iterations, () => {
                initialAnimation = false;
            })
        })
    }

    sketch.draw = () => {
        //logic
        if (run && !initialAnimation) {
            if (!run.grid.isFull()) {
                applyGravity(run.grid);
                run.grid.generateItems(run);
            } else {
                if (!run.inAnimation) {
                    removeMatches(findMatches(run.grid), true);
                }
                if (run.moves === 0) {
                    reload()
                }
            }


            //animations
            canvas.drawPlayfield();
            if (run.findEnemy()) {
                run.drawRunInfo(canvas, () => { run.inAnimation = false })
                run.grid.draw(canvas, sketch, !!currentDialog);
                run.grid.drawItems(sketch);
            }

            textAnimations.forEach((animation: TextAnimation) => {
                animation.draw(sketch, textAnimations);
                animation.updatePosition(textAnimations)
            });


            if (run.winState) {
                setTimeout(() => {
                    let finalScore: number = run.score;
                    run = undefined
                    dialogs = [];
                    alert('YOU WON!\nwith a score of: ' + formatNumber(finalScore))
                    setupGame();
                }, 500);
            }

            updatePlayerStatsAndRewards();
        }

        dialogs.forEach((dialog: Dialog) => {
            currentDialog = dialog;
            dialog.draw(canvas);
        });
    }

    sketch.mouseClicked = () => {
        let lastClick: Position = new Position(sketch.mouseX, sketch.mouseY)
        if (!currentDialog) {
            let clickFound: boolean = false;
            run.grid.iterateXtoY((x: number, y: number) => {
                let cell: Cell = run.grid.cells[x][y];

                let limits: number[] = [
                    cell.canvasPosition.x,
                    cell.canvasPosition.x + run.grid.sideSize,
                    cell.canvasPosition.y,
                    cell.canvasPosition.y + run.grid.sideSize
                ]

                if (checkPositionInLimit(lastClick, ...limits)) {
                    clickFound = true
                    run.initialShuffle = false;

                    if (!run.grid.selectedCellPos) {
                        run.grid.selectedCellPos = cell.position
                        run.stackCombo = false;
                        updateCombo([], true);
                        updateDamage(0, true);
                    } else {
                        run.stackCombo = true;
                        let movesLeft: number = run.moves - 1;
                        if (Math.random() < run.moveSaver) {
                            movesLeft = run.moves
                        }

                        swap(cell.position, run.grid.selectedCellPos, (() => { run.moves = movesLeft }).bind(this, movesLeft), true);
                        run.grid.selectedCellPos = undefined
                        lastClick = new Position(0, 0)
                    }
                }

            }, () => clickFound);
        } else {
            currentDialog.options.forEach((option: DialogOption) => {
                if (checkPositionInLimit(lastClick, ...option.limits)) {
                    option.action();
                    dialogs.pop()
                    currentDialog = undefined
                }
            })
        }
    }

    function swap(position1: Position, position2: Position, callback: () => void, humanSwap: boolean = false, animate: boolean = true): void {
        let swapFunc: () => void = run.grid.validateSwap(position1, position2, callback, humanSwap);
        if (swapFunc) {
            if (animate) {
                animateSwap(run.grid.getAnimateSwapData(position1, position2, humanSwap), swapFunc);
            } else {
                swapFunc();
            }
        }
    }

    function animateSwap(animateSwapData: AnimateSwapData, callback: () => void): void {
        let { item1, item2, cell1, cell2, frames } = animateSwapData;

        if (item1) {
            item1.animationEndCallback = callback
            item1.setupNewAnimation(frames, cell2.canvasPosition.difference(cell1.canvasPosition))
        }

        if (item2) {
            item2.setupNewAnimation(frames, cell2.canvasPosition.minus(cell1.canvasPosition))
        }
    }

    function removeItem(item: Item, animate: boolean = true) {
        if (animate) {
            run.inAnimation = true;
            item.animationEndCallback = (() => {
                run.grid.getCellbyPosition(item.position).item = undefined;
                run.inAnimation = false
            }).bind(this);
            item.setupNewAnimation(10, new Position(0, 0), 255);
        } else {
            run.grid.getCellbyPosition(item.position).item = undefined;
        }

    }

    function removeMatches(matches: Item[][], animate: boolean = true): void {
        if (run.stackCombo) {
            updateCombo(matches);
        }

        matches.forEach((match: Item[]) => {
            if (!run.initialShuffle) {
                if (run.character.rewards.findIndex((reward: Reward) => reward.name === '4 way match health regen') >= 0) {
                    if (match.length >= 4) {
                        run.character.heal(run.character.health / 100 * run.character.hpRegenFromReward);
                    }
                }

                updateScore(match);
            }
            match.forEach((item: Item) => {
                removeItem(item, animate);
            });
        });
    }

    function findMatches(grid: Grid): Item[][] {
        let matches: Item[][] = [];
        grid.iterateYtoX((x: number, y: number) => {
            let cell = grid.getCellbyPosition(new Position(x, y));

            if (cell.item) {
                let item: Item = cell.item
                let horizontalMatch: Item[] = [item]

                // horizontal match
                let sameShape: boolean = true
                let increment: number = 1;
                while (sameShape && (increment + x) < grid.width) {
                    let nextItem: Item = grid.getNeighbourCell(cell, increment, 0).item
                    sameShape = nextItem && item.shape.sides === nextItem.shape.sides;
                    if (sameShape) {
                        horizontalMatch.push(nextItem);
                        increment++;
                    }
                }

                // vertical match
                sameShape = true
                increment = 1;
                let verticalMatch: Item[] = [item]
                while (sameShape && increment + y < grid.height) {
                    let nextItem: Item = grid.getNeighbourCell(cell, 0, increment).item
                    sameShape = nextItem && item.shape.sides === nextItem.shape.sides;
                    if (sameShape) {
                        verticalMatch.push(nextItem);
                        increment++;
                    }
                }

                let omniMatch: Item[] = [...(horizontalMatch.length > 2 ? horizontalMatch : []), ...(verticalMatch.length > 2 ? verticalMatch : [])]

                if (omniMatch.length) {
                    matches.push(omniMatch)
                }
            }
        });
        return matches
    }

    function applyGravity(grid: Grid, animate: boolean = true): void {
        grid.iterateYtoX((x: number, y: number) => {
            if (y < grid.height - 1 && !grid.cells[x][y + 1].item) {
                swap(grid.cells[x][y].position, grid.cells[x][y + 1].position, undefined, false, animate);
            }
        });
    }

    function reload(): void {
        run.moves = run.movesPerStage;
        let damage: number = run.findEnemy().attack;
        run.character.takeDamage(damage, ((damage: number, shielded: boolean) => {
            damagePlayerAnimation(Math.floor(damage), shielded)
        }).bind(this), (() => {
            let finalScore: number = run.score;
            alert('YOU LOST!\nwith a score of: ' + formatNumber(finalScore));
            setupGame();
        }).bind(this))

    }

    function damagePlayerAnimation(damage: number, shielded: boolean = false): void {
        let textAnimation: TextAnimation = new TextAnimation(
            shielded ? 'Shielded' : `-${damage} HP`,
            20,
            shielded ? new Color(101, 206, 80) : new Color(214, 87, 49),
            4,
            sketch.CENTER,
            new Position(canvas.canvasSize.x / 2, canvas.totalUiSize),
            new Position(0, 200),
            180
        );

        textAnimations.push(textAnimation);
    }

    function updateScore(match: Item[], resetCounter: boolean = false): void {
        if (resetCounter) {
            run.score = 0
            run.initialShuffle = true;
        }
        let bonusDmg: number = 0
        if (match[0]?.shape) {
            bonusDmg += match[0].shape.bonusDmg;
        }

        let additiveScore: number = (run.character.attack + bonusDmg) * match.length * run.combo;

        run.score += additiveScore
        scoreCounter.innerHTML = formatNumber(run.score);

        bestScore = bestScore > run.score ? bestScore : run.score;
        bestScoreCounter.innerHTML = formatNumber(bestScore);

        if (!resetCounter) {
            let cell1: Cell = run.grid.getCellbyPosition(match[0].position);
            let cell2: Cell = run.grid.getCellbyPosition(match[match.length - 1].position);
            let position: Position = cell1.canvasPosition.average(cell2.canvasPosition);
            damageEnemy(additiveScore, position);
            updateDamage(additiveScore);
        }
    }

    function damageEnemy(damage: number, position: Position): void {
        damage = damage * run.character.damageMultiplier;
        let enemy: Enemy = run.findEnemy()
        let finalDamage: number = damage;
        let overkill: boolean = enemy.currentHealth < damage;

        if (overkill) {
            finalDamage = enemy.currentHealth;
        }

        enemy.damage(finalDamage, run,
            () => {
                if (run.findEnemy()?.number === run.enemyPerStage) {
                    bossFightAnimation();
                }
            }, () => {
                run.stackCombo = false;
                run.initialShuffle = true;
                run.moves = run.movesPerStage;
                run.newPercDialog(dialogs, updatePlayerStatsAndRewards.bind(this))
            }, () => {
                newFloorAnimation()
            });
        damageAnimation(damage, overkill, position);
    }

    function bossFightAnimation(): void {
        let floorComplete: TextAnimation = new TextAnimation(
            `Boss Fight`,
            60,
            new Color(87, 49, 214),
            4,
            sketch.CENTER,
            new Position(canvas.canvasSize.x / 2, canvas.canvasSize.y / 2),
            new Position(0, 0),
            240,
            -40
        );
        textAnimations.push(floorComplete);

    }

    function newFloorAnimation(): void {
        let floorComplete: TextAnimation = new TextAnimation(
            `Floor Complete`,
            40,
            new Color(255, 255, 255),
            4,
            sketch.CENTER,
            new Position(canvas.canvasSize.x / 2, canvas.canvasSize.y / 2 + canvas.totalUiSize),
            new Position(0, -200),
            240
        );
        textAnimations.push(floorComplete);

    }

    function damageAnimation(damage: number, overkill: boolean, positon: Position): void {
        let varianceX: number = Math.ceil(Math.random() * 50) * (Math.round(Math.random()) ? 1 : -1)
        let varianceY: number = Math.ceil(Math.random() * 50) * (Math.round(Math.random()) ? 1 : -1)

        let textAnimation: TextAnimation = new TextAnimation(
            `${damage} DMG`,
            20,
            overkill ? new Color(255, 0, 0) : new Color(255, 255, 255),
            4,
            sketch.CENTER,
            new Position(positon.x + varianceX, positon.y + varianceY),
            new Position(0, -200),
            180
        );

        textAnimations.push(textAnimation);
    }

    function updateCombo(matches: Item[][], resetCounter: boolean = false): void {
        if (resetCounter) {
            run.combo = 0
            run.initialShuffle = true;
            run.stackCombo = false;
            comboCounter.setAttribute('style', 'font-size: 1em');
        }

        run.combo += [...matches].length;
        comboCounter.innerHTML = formatNumber(run.combo);

        bestCombo = bestCombo > run.combo ? bestCombo : run.combo;
        bestComboCounter.innerHTML = formatNumber(bestCombo);

        let fontSize: number = run.damage > 0 ? ((run.combo / bestCombo) * 2 >= 1 ? (run.combo / bestCombo) * 2 : 1) : 1;
        comboCounter.setAttribute('style', 'font-size: ' + fontSize + 'em; ' + (bestCombo === run.combo && run.combo !== 0 ? 'color: red' : 'color: white'));
    }

    function updateDamage(damageDealt: number, resetCounter: boolean = false): void {
        if (resetCounter) {
            run.damage = 0
            run.initialShuffle = true;
            run.stackCombo = false;
            damageCounter.setAttribute('style', 'font-size: 1em');
        }

        run.damage += damageDealt;
        damageCounter.innerHTML = formatNumber(run.damage);

        bestDamage = bestDamage > run.damage ? bestDamage : run.damage;
        bestDamageCounter.innerHTML = formatNumber(bestDamage);

        let fontSize: number = run.damage > 0 ? ((run.damage / bestDamage) * 2 >= 1 ? (run.damage / bestDamage) * 2 : 1) : 1;
        damageCounter.setAttribute('style', 'font-size: ' + fontSize + 'em; ' + (bestDamage === run.damage && run.damage !== 0 ? 'color: red' : 'color: white'));
    }

    function updatePlayerStatsAndRewards(): void {
        if (!runInfo.classList.contains('show')) {
            runInfo.classList.add('show');
        }

        let statsContent: string = '';
        if (run?.character) {
            let hasShield: boolean = run.character.hasItemThatPreventsFirstLethalDamage && !run.character.hasUsedItemThatPreventsFirstLethalDamage;

            statsContent += '<div class="stats-ui">'

            statsContent += '<div class="stat">'
            statsContent += `<strong>Attack:</strong>&nbsp;<span>${formatNumber(run.character.attack)}</span>`
            statsContent += '</div>';

            statsContent += '<div class="stat">'
            statsContent += `<strong>Damage Multiplier:</strong>&nbsp;<span>x${run.character.damageMultiplier}</span>`
            statsContent += '</div>';

            statsContent += '<div class="stat">'
            statsContent += `<strong>Moves:</strong>&nbsp;<span style="${run.moves > 5 ? 'color: white' : 'color: red'}">${run.moves}</span><span>&nbsp;/&nbsp;${run.movesPerStage}</span>`
            statsContent += '</div>';

            statsContent += '<div class="stat">'
            statsContent += hasShield ? `<strong class="shield">Shielded</strong>` : ''
            statsContent += '</div>';

            statsContent += '</div>';
        }

        statsContainer.innerHTML = statsContent;

        let rewardsContent: string = '';

        if (run?.character?.rewards) {
            run.character.rewards.forEach((reward: Reward, index: number) => {
                if (index % 4 === 0 || index === 0) {
                    rewardsContent += '</div><div class="reward-ui">'
                }
                rewardsContent += `
                <div class="reward-wrap">
                <div class="centered reward rarity-${reward.rarity}">
                <span class="rarity">${reward.rarity}</span><br>
                    <h3>${reward.name}</h3>
                    <strong>${reward.description}</strong>
                </div>
                </div>
                <br>`
            })
            rewardsContent += '</div>';
        }

        rewardsContainer.innerHTML = rewardsContent;
    }
});
