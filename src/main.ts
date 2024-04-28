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
import { checkPositionInLimit } from "./utils/Functions";

let resetButton: HTMLElement = document.getElementById('resetBtn');
let scoreCounter: HTMLElement = document.getElementById('scoreCounter');
let bestScoreCounter: HTMLElement = document.getElementById('bestScoreCounter');
let comboCounter: HTMLElement = document.getElementById('comboCounter');
let bestComboCounter: HTMLElement = document.getElementById('bestComboCounter');
let moveCounter: HTMLElement = document.getElementById('moveCounter');
let moveContainerCounter: HTMLElement = document.getElementById('moveContainerCounter');
let rewardsContainer: HTMLElement = document.getElementById('rewardsContainer');

new p5((sketch: p5) => {


    let bestScore: number = 0;
    let bestCombo: number = 0;
    let currentDialog: Dialog | undefined;

    let globalRun: Run;
    let globalCanvas: CanvasInfo;
    let globalAnimations: TextAnimation[] = [];
    let globalDialogs: Dialog[] = [];

    let initialAnimation: boolean = true;

    sketch.setup = () => {
        globalCanvas = new CanvasInfo(sketch, 16, 4, 4, 20, 5);
        sketch.textFont('Open Sans')

        resetButton.onclick = () => {
            setupGame();
        }

        setupGame();
    }

    function setupGame(): void {
        if (globalRun) {
            globalRun.winState = false
        }
        Run.newGameDialog(sketch, globalDialogs, (config: RunConfig) => {
            initialAnimation = true;
            globalRun = new Run(sketch, Character.defaultCharacter(), config.floors, config.stages, config.enemies, config.moves)
            globalRun.setupGrid(new Grid(config.gridX, config.gridY));
            globalRun.setupCanvas(globalCanvas);
            globalRun.grid.calculateSpacing(globalCanvas);

            globalAnimations = [];
            globalRun.inAnimation = false
            currentDialog = undefined;

            updateScore([], true)
            updateCombo([], true)
            updateMoves(globalRun.movesPerStage)

            //clear board before drawing

            let iterations: number = 50;
            let intervalWithCallback = (duration: number, callback: () => void) => {
                let count: number = 0;
                let interval = setInterval(() => {
                    if (!globalRun.grid.isFull()) {
                        applyGravity(globalRun.grid, false);
                        globalRun.grid.generateItems(globalRun);
                    } else {
                        removeMatches(findMatches(globalRun.grid), false);
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
        if (globalRun && !initialAnimation) {
            if (!globalRun.grid.isFull()) {
                applyGravity(globalRun.grid);
                globalRun.grid.generateItems(globalRun);
            } else {
                if (!globalRun.inAnimation) {
                    removeMatches(findMatches(globalRun.grid), false);
                }
                if (globalRun.moves === 0) {
                    reload()
                }
            }

            
            //animations
            globalCanvas.drawPlayfield();
            if (globalRun.findEnemy()) {
                globalRun.drawRunInfo(globalCanvas)
                globalRun.grid.draw(globalCanvas, sketch, !!currentDialog);
                globalRun.grid.drawItems(sketch);
            }

            globalAnimations.forEach((animation: TextAnimation) => {
                animation.draw(sketch, globalAnimations);
                animation.updatePosition(globalAnimations)
            });


            if (globalRun.winState) {
                setTimeout(() => {
                    globalRun = undefined
                    globalDialogs = [];
                    alert('YOU WON!')
                    setupGame();
                }, 500);
            }

            updatePlayerRewards();
        }

        globalDialogs.forEach((dialog: Dialog) => {
            currentDialog = dialog;
            dialog.draw(globalCanvas);
        });
    }

    sketch.mouseClicked = () => {
        let lastClick: Position = new Position(sketch.mouseX, sketch.mouseY)
        if (!currentDialog) {
            let clickFound: boolean = false;
            globalRun.grid.iterateXtoY((x: number, y: number) => {
                let cell: Cell = globalRun.grid.cells[x][y];

                let limits: number[] = [
                    cell.canvasPosition.x,
                    cell.canvasPosition.x + globalRun.grid.sideSize,
                    cell.canvasPosition.y,
                    cell.canvasPosition.y + globalRun.grid.sideSize
                ]

                if (checkPositionInLimit(lastClick, ...limits)) {
                    clickFound = true
                    globalRun.initialShuffle = false;

                    if (!globalRun.grid.selectedCellPos) {
                        globalRun.grid.selectedCellPos = cell.position
                        globalRun.stackCombo = false;
                        globalRun.combo = 0
                    } else {
                        globalRun.stackCombo = true;
                        let movesLeft: number = globalRun.moves - 1;
                        if (Math.random() < globalRun.moveSaver) {
                            movesLeft = globalRun.moves
                        }

                        swap(cell.position, globalRun.grid.selectedCellPos, updateMoves.bind(this, movesLeft), true);
                        globalRun.grid.selectedCellPos = undefined
                        lastClick = new Position(0, 0)
                    }
                }
            }, () => clickFound);
            updateMoves(globalRun.moves);
        } else {
            currentDialog.options.forEach((option: DialogOption) => {
                if (checkPositionInLimit(lastClick, ...option.limits)) {
                    option.action();
                    globalDialogs.pop()
                    currentDialog = undefined
                }
            })
        }
    }

    function swap(position1: Position, position2: Position, callback: () => void, humanSwap: boolean = false, animate: boolean = true): void {
        let swapFunc: () => void = globalRun.grid.validateSwap(position1, position2, callback, humanSwap);
        if (swapFunc) {
            if (animate) {
                animateSwap(globalRun.grid.getAnimateSwapData(position1, position2), swapFunc);
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
            globalRun.inAnimation = true;
            item.animationEndCallback = () => {
                globalRun.grid.getCellbyPosition(item.position).item = undefined;
                globalRun.inAnimation = false
            };
            item.setupNewAnimation(5, new Position(0, 0), 255);
        } else {
            globalRun.grid.getCellbyPosition(item.position).item = undefined;
        }

    }

    function removeMatches(matches: Item[][], animate: boolean = true): void {
        if (globalRun.stackCombo) {
            updateCombo(matches);
        }

        matches.forEach((match: Item[]) => {
            if (!globalRun.initialShuffle) {
                if (globalRun.character.rewards.findIndex((reward: Reward) => reward.name === '4 way match health regen') >= 0) {
                    if (match.length >= 4) {
                        globalRun.character.heal(globalRun.character.health / 100 * globalRun.character.hpRegenFromReward);
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
        updateMoves(globalRun.movesPerStage);
        let damage: number = globalRun.findEnemy().attack;
        globalRun.character.damage(damage, undefined, setupGame.bind(this))
        damagePlayerAnimation(Math.floor(damage))
    }

    function damagePlayerAnimation(damage: number): void {
        let textAnimation: TextAnimation = new TextAnimation(
            `-${damage} HP`,
            20,
            new Color(214, 87, 49),
            4,
            sketch.CENTER,
            new Position(globalCanvas.canvasSize.x / 2, globalCanvas.totalUiSize),
            new Position(0, 200),
            180
        );

        globalAnimations.push(textAnimation);
    }

    function updateScore(match: Item[], resetCounter: boolean = false): void {
        if (resetCounter) {
            globalRun.score = 0
            globalRun.initialShuffle = true;
        }
        let bonusDmg: number = globalRun.damageBoost;
        if (match[0]?.shape) {
            bonusDmg += match[0].shape.bonusDmg;
        }

        let additiveScore: number = (100 + bonusDmg) * match.length * globalRun.combo;

        globalRun.score += additiveScore
        scoreCounter.innerHTML = globalRun.score + ''

        bestScore = bestScore > globalRun.score ? bestScore : globalRun.score;
        bestScoreCounter.innerHTML = bestScore + ''

        if (!resetCounter) {
            damageEnemy(globalRun, additiveScore);
        }
    }

    function damageEnemy(run: Run, damage: number): void {
        damage = damage * run.damageMultiplier;
        let enemy: Enemy = run.findEnemy()
        let finalDamage: number = damage;
        let overkill: boolean = enemy.currentHealth < damage;

        if (overkill) {
            finalDamage = enemy.currentHealth;
        }

        enemy.damage(finalDamage, run, () => {
            run.stackCombo = false;
            run.initialShuffle = true;
            updateMoves(run.movesPerStage)
            globalRun.newPercDialog(globalDialogs, updatePlayerRewards.bind(this))
        }, () => {
            newFloorAnimation()
        });
        damageAnimation(damage, overkill);
    }

    function newFloorAnimation(): void {
        let floorComplete: TextAnimation = new TextAnimation(
            `Floor Complete`,
            40,
            new Color(255, 255, 255),
            4,
            sketch.CENTER,
            new Position(globalCanvas.canvasSize.x / 2, globalCanvas.canvasSize.y / 2 + globalCanvas.totalUiSize),
            new Position(0, -200),
            240
        );
        globalAnimations.push(floorComplete);

    }

    function damageAnimation(damage: number, overkill: boolean): void {
        let varianceX: number = Math.ceil(Math.random() * 50) * (Math.round(Math.random()) ? 1 : -1)
        let varianceY: number = Math.ceil(Math.random() * 50) * (Math.round(Math.random()) ? 1 : -1)

        let textAnimation: TextAnimation = new TextAnimation(
            `${damage} DMG`,
            20,
            overkill ? new Color(255, 0, 0) : new Color(255, 255, 255),
            4,
            sketch.CENTER,
            new Position(sketch.mouseX + varianceX, sketch.mouseY + varianceY),
            new Position(0, -200),
            180
        );

        globalAnimations.push(textAnimation);
    }


    function updateCombo(matches: Item[][], resetCounter: boolean = false): void {
        if (resetCounter) {
            globalRun.combo = 0
            globalRun.initialShuffle = true;
            globalRun.stackCombo = false;
            comboCounter.setAttribute('style', 'font-size: 1em');
        }

        globalRun.combo += [...matches].length;
        comboCounter.innerHTML = globalRun.combo + ''

        bestCombo = bestCombo > globalRun.combo ? bestCombo : globalRun.combo;
        bestComboCounter.innerHTML = bestCombo + ''

        let fontSize: number = globalRun.combo > 0 ? globalRun.combo : 1;
        comboCounter.setAttribute('style', 'font-size: ' + fontSize + 'em');
    }

    function updateMoves(value: number): void {
        globalRun.moves = value

        moveCounter.innerHTML = globalRun.moves + ''
        moveCounter.setAttribute('style', value > 5 ? 'color: white' : 'color: red');

        moveContainerCounter.innerHTML = globalRun.movesPerStage + '';
    }

    function updatePlayerRewards(): void {
        let rewardsContent: string = '';

        if (globalRun?.character?.rewards) {
            globalRun.character.rewards.forEach((reward: Reward, index: number) => {
                if (index % 3 === 0 || index === 0) {
                    rewardsContent += '</div><div class="reward-ui">'
                }
                rewardsContent += `
                <div class="centered reward rarity-${reward.rarity}">
                <span class="rarity">${reward.rarity}</span><br>
                    <h3>${reward.name}</h3>
                    <strong>${reward.description}</strong>
                </div><br>`
            })
            rewardsContent += '</div>';
        }

        rewardsContainer.innerHTML = rewardsContent;
    }
});
