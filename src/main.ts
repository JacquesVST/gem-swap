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
import { Run } from "./models/Run";
import { TextAnimation } from "./models/TextAnimation";
import { checkPositionInLimit } from "./utils/Functions";

let gridInputX: HTMLInputElement = document.getElementById('gridX') as HTMLInputElement;
let gridInputY: HTMLInputElement = document.getElementById('gridY') as HTMLInputElement;
let resetButton: HTMLElement = document.getElementById('resetBtn');
let scoreCounter: HTMLElement = document.getElementById('scoreCounter');
let bestScoreCounter: HTMLElement = document.getElementById('bestScoreCounter');
let comboCounter: HTMLElement = document.getElementById('comboCounter');
let bestComboCounter: HTMLElement = document.getElementById('bestComboCounter');
let moveCounter: HTMLElement = document.getElementById('moveCounter');
let moveContainerCounter: HTMLElement = document.getElementById('moveContainerCounter');

let initialShuffle: boolean = true;
let stackCombo: boolean = false;

new p5((sketch: p5) => {

    let bestScore: number = 0;
    let bestCombo: number = 0;
    let currentDialog: Dialog | undefined;
    let inAnimation: boolean = false;

    let globalRun: Run;
    let globalGrid: Grid;
    let globalCanvas: CanvasInfo;
    let globalAnimations: TextAnimation[];
    let globalDialogs: Dialog[];

    sketch.setup = () => {
        gridInputX.value = "12"
        gridInputY.value = "8"

        resetButton.onclick = () => {
            setupGame();
        }

        setupGame();
    }

    function setupGame(): void {
        setTimeout(() => {
            let character: Character = new Character(100)

            globalRun = new Run(sketch, character, 50, 50, 50, 10);
            globalCanvas = new CanvasInfo(sketch, 16, 4, 4, 20, 6);
            globalGrid = new Grid(parseInt(gridInputX.value, 10), parseInt(gridInputY.value, 10));
            globalGrid.calculateSpacing(globalCanvas);

            globalAnimations = [];
            globalDialogs = [];
            currentDialog = undefined;

            updateScore([], true)
            updateCombo([], true)
            updateMoves(globalRun.movesPerStage)
        }, 0);
    }

    sketch.draw = () => {
        sketch.frameRate(60)
        //logic

        if (!globalGrid.isFull()) {
            applyGravity(globalGrid);
            globalGrid.generateItems(globalRun);
        } else {
            if(!inAnimation) {
                removeMatches(findMatches(globalGrid));
            }
            if (globalRun.moves === 0) {
                reload()
            }
        }

        //animations
        globalCanvas.drawPlayfield();
        globalRun.drawRunInfo(globalCanvas)
        globalGrid.draw(globalCanvas, sketch, !!currentDialog);
        globalGrid.drawItems(sketch);

        globalAnimations.forEach((animation: TextAnimation) => {
            animation.draw(sketch, globalAnimations);
            animation.updatePosition(globalAnimations)
        });

        globalDialogs.forEach((dialog: Dialog) => {
            currentDialog = dialog;
            dialog.draw(globalCanvas);
        });

        if (globalRun.winState) {
            alert('YOU WON!')
            setupGame();
        }
    }

    sketch.mouseClicked = () => {
        let lastClick: Position = new Position(sketch.mouseX, sketch.mouseY)
        if (!currentDialog) {
            let clickFound: boolean = false;
            globalGrid.iterateXtoY((x: number, y: number) => {
                let cell: Cell = globalGrid.cells[x][y];

                let limits: number[] = [
                    cell.canvasPosition.x,
                    cell.canvasPosition.x + globalGrid.sideSize,
                    cell.canvasPosition.y,
                    cell.canvasPosition.y + globalGrid.sideSize
                ]

                if (checkPositionInLimit(lastClick, ...limits)) {
                    clickFound = true
                    initialShuffle = false;

                    if (!globalGrid.selectedCellPos) {
                        globalGrid.selectedCellPos = cell.position
                        stackCombo = false;
                        globalRun.combo = 0
                    } else {
                        stackCombo = true;
                        swap(cell.position, globalGrid.selectedCellPos, updateMoves.bind(this, globalRun.moves - 1), true);
                        globalGrid.selectedCellPos = undefined
                        lastClick = new Position(0, 0)
                    }
                }
            }, () => clickFound);
        } else {
            currentDialog.options.forEach((option: DialogOption) => {
                if (checkPositionInLimit(lastClick, ...option.limits)) {
                    option.action();
                    globalDialogs.pop()
                    currentDialog = undefined
                }
            })
        }
        updateMoves(globalRun.moves);
    }

    function swap(position1: Position, position2: Position, callback: () => void, humanSwap: boolean = true): void {
        let swapFunc: () => void = globalGrid.validateSwap(position1, position2, callback, humanSwap);
        if (swapFunc) {
            animateSwap(globalGrid.getAnimateSwapData(position1, position2), swapFunc)
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

    function removeItem(item: Item) {
        inAnimation = true;
        item.animationEndCallback = () => { globalGrid.getCellbyPosition(item.position).item = undefined; inAnimation= false };
        item.setupNewAnimation(5, new Position(0, 0), 255);
    }

    function removeMatches(matches: Item[][]): void {
        if (stackCombo) {
            updateCombo(matches);
        }

        matches.forEach((match: Item[]) => {
            if (!initialShuffle) {
                updateScore(match);
            }
            match.forEach((item: Item) => {
                removeItem(item);
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

    function applyGravity(grid: Grid): void {
        grid.iterateYtoX((x: number, y: number) => {
            if (y < grid.height - 1 && !grid.cells[x][y + 1].item) {
                swap(grid.cells[x][y].position, grid.cells[x][y + 1].position, undefined);
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
            initialShuffle = true;
        }

        let additiveScore: number = 100 * match.length * globalRun.combo;

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
            globalRun.newPercDialog(globalDialogs)
        })
        damageAnimation(damage, overkill);
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
            initialShuffle = true;
            stackCombo = false;
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
        moveCounter.setAttribute('style', value > 10 ? 'color: white' : 'color: red');

        moveContainerCounter.innerHTML = globalRun.movesPerStage + '';
    }


});
