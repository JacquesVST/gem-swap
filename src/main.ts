import './global.js';
import 'p5/lib/addons/p5.sound';
import * as P5 from 'p5';
import { CanvasInfo } from "./models/CanvasInfo";
import { Cell } from "./models/Cell";
import { Character } from "./models/Character";
import { Color } from "./models/Color";
import { Dialog, DialogOption, RewardDialogOption } from "./models/Dialog";
import { Enemy } from "./models/Enemy";
import { AnimateSwapData, Grid } from "./models/Grid";
import { Item } from "./models/Item";
import { Position } from "./models/Position";
import { Reward } from "./models/Reward";
import { Run, RunConfig } from "./models/Run";
import { TextAnimation } from "./models/TextAnimation";
import { checkPositionInLimit, formatNumber } from "./utils/Functions";
import * as p5 from 'p5';

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

const sketch = (p5Instance: P5) => {
    let bestScore: number = 0;
    let bestCombo: number = 0;
    let bestDamage: number = 0;
    let currentDialog: Dialog | undefined;

    let run: Run;
    let canvas: CanvasInfo;
    let textAnimations: TextAnimation[] = [];
    let dialogs: Dialog[] = [];

    let sounds: {[key: string]: p5.SoundFile};

    p5Instance.preload = () =>  {
        p5Instance.soundFormats('mp3')
        
        sounds = {
            bossDefeat: p5Instance.loadSound('https://raw.githubusercontent.com/JacquesVST/gem-swap/main/src/assets/boss-defeat.mp3'),
            defeat: p5Instance.loadSound('https://raw.githubusercontent.com/JacquesVST/gem-swap/main/src/assets/defeat.mp3'),
            enemyDefeat: p5Instance.loadSound('https://raw.githubusercontent.com/JacquesVST/gem-swap/main/src/assets/enemy-defeat.mp3'),
            item: p5Instance.loadSound('https://raw.githubusercontent.com/JacquesVST/gem-swap/main/src/assets/item.mp3'),
            match: p5Instance.loadSound('https://raw.githubusercontent.com/JacquesVST/gem-swap/main/src/assets/match.mp3'),
            move: p5Instance.loadSound('https://raw.githubusercontent.com/JacquesVST/gem-swap/main/src/assets/move.mp3'),
            newFloor: p5Instance.loadSound('https://raw.githubusercontent.com/JacquesVST/gem-swap/main/src/assets/new-floor.mp3'),
            noMove: p5Instance.loadSound('https://raw.githubusercontent.com/JacquesVST/gem-swap/main/src/assets/no-move.mp3'),
            select:p5Instance.loadSound('https://raw.githubusercontent.com/JacquesVST/gem-swap/main/src/assets/generic.mp3')
        }
        
    }

    p5Instance.setup = () => {
        canvas = new CanvasInfo(p5Instance, 16, 4, 4, 20, 5);
        p5Instance.textFont('Open Sans')
        
        resetButton.onclick = () => {
            setupGame();
        }

        setupGame();
    }

    function setupGame(): void {
        if (run) {
            run = undefined;
        }
        Run.newGameDialog(p5Instance, dialogs, (config: RunConfig) => {
            run = new Run(p5Instance, Character.defaultCharacter(), config.floors, config.stages, config.enemies, config.moves, config.costMultiplier)
            run.grid = new Grid(config.gridX, config.gridY);
            run.setupCanvas(canvas);
            run.grid.calculateSpacing(canvas);
           // run.sounds = sounds;

            textAnimations = [];
            run.inAnimation = false

            updateScore([], true);
            updateCombo([], true);
            updateDamage(0, true);

            //clear board before drawing

            clearBoard();
        })
    }

    p5Instance.draw = () => {
        //logic
        if (run && !run.initialAnimation) {
            if (!run.grid.isFull()) {
                applyGravity(run.grid);
                run.grid.generateItems(run);
            } else {
                if (!run.inAnimation && !currentDialog) {
                    removeMatches(findMatches(run.grid), true);
                }
                if (run.character.moves === 0) {
                    reload()
                }
            }

            //animations
            canvas.drawPlayfield();

            run.drawRunInfo(canvas, () => { run ? run.inAnimation = false : undefined })
            run.grid.draw(canvas, p5Instance, !!currentDialog);
            run.grid.drawItems(p5Instance);

            if (run.winState) {
                setTimeout(() => {
                    let finalScore: number = run.score;
                    dialogs = [];
                    alert('YOU WON!\nwith a score of: ' + formatNumber(finalScore))
                    setupGame();
                }, 0);
            }
        }

        dialogs.forEach((dialog: Dialog) => {
            currentDialog = dialog;
            dialog.draw(canvas, run?.character);
        });

        textAnimations.forEach((animation: TextAnimation) => {
            animation.draw(p5Instance, textAnimations);
        });
    }

    p5Instance.mouseClicked = () => {
        //p5Instance.userStartAudio();
        let lastClick: Position = new Position(p5Instance.mouseX, p5Instance.mouseY)
        if (!currentDialog && run) {
            let clickFound: boolean = false;
            run.grid.iterateXtoY((x: number, y: number) => {
                let cell: Cell = run.grid.cells[x][y];

                let limits: number[] = [
                    cell.canvasPosition.x,
                    cell.canvasPosition.x + run.grid.sideSize,
                    cell.canvasPosition.y,
                    cell.canvasPosition.y + run.grid.sideSize
                ]

                if (checkPositionInLimit(lastClick, ...limits) && run.grid.isFull()) {
                    clickFound = true
                    run.initialShuffle = false;

                    
                    if (!run.grid.selectedCellPos) {
                        sounds['select'].play();
                        run.grid.selectedCellPos = cell.position
                        run.stackCombo = false;
                        updateCombo([], true);
                        updateDamage(0, true);
                    } else {
                        run.stackCombo = true;
                        let movesLeft: number = run.character.moves - 1;

                        swap(cell.position, run.grid.selectedCellPos, (() => {
                            if (Math.random() < run.character.moveSaver) {
                                movesLeft = run.character.moves
                                moveSavedAnimation();
                            }
                            run.character.moves = movesLeft
                            updatePlayerStatsAndRewards();
                        }).bind(this), true);
                        run.grid.selectedCellPos = undefined
                        lastClick = new Position(0, 0)
                    }
                }
            }, () => clickFound);
        } 
        
        if (currentDialog) {
            let selectedIndex: number = -1;

            currentDialog.options.forEach((option: DialogOption, index: number) => {
                if (checkPositionInLimit(lastClick, ...option.limits)) {
                    selectedIndex = index;
                    if (!option.disabled) {
                        option.action();
                        if (option instanceof RewardDialogOption && option?.reward?.price) {
                            goldAnimation(option.reward.price * -1)
                            option.reward.price = Math.floor(option.reward.price * 1.2);
                        }
                    }
                }
            })

            if (selectedIndex >= 0) {
                if (currentDialog && !currentDialog.keep) {
                    currentDialog = undefined
                    dialogs.pop()
                }
            }
            updatePlayerStatsAndRewards();
        }
    }

    function swap(position1: Position, position2: Position, callback: () => void, humanSwap: boolean = false, animate: boolean = true): void {
        let swapFunc: () => void = run.grid.validateSwap(position1, position2, callback, humanSwap, (() => {
            sounds['noMove'].play();
        }).bind(this), (() => {
            sounds['move'].play();
        }).bind(this));
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
            sounds['match'].play();
            run.inAnimation = true;
            item.animationEndCallback = (() => {
                run.grid.getCellbyPosition(item.position).item = undefined;
                run.inAnimation = false
            }).bind(this);
            item.setupNewAnimation(run.stackCombo ? 10 : 3, new Position(0, 0), 255);
        } else {
            run.grid.getCellbyPosition(item.position).item = undefined;
        }

    }

    function clearBoard(): void {
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
            run.initialAnimation = false;
        })
    }

    function removeMatches(matches: Item[][], animate: boolean = true): void {
        if (run.stackCombo) {
            updateCombo(matches);
        }

        matches.forEach((match: Item[]) => {
            if (!run.initialShuffle) {
                if (run.character.hpRegenFromReward > 0) {
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
        run.character.moves = run.movesPerStage;
        let damage: number = run.findEnemy().attack;
        run.character.takeDamage(damage, ((damage: number, shielded: boolean) => {
            damagePlayerAnimation(Math.floor(damage), shielded)
        }).bind(this), (() => {
            let finalScore: number = run.score;
            sounds['defeat'].play();
            alert('YOU LOST!\nwith a score of: ' + formatNumber(finalScore));
            setupGame();
        }).bind(this))

    }

    function updateScore(match: Item[], resetCounter: boolean = false): void {
        if (resetCounter) {
            run.score = 0
            run.initialShuffle = true;
        }
        let bonusDmg: number = 0
        if (match[0]?.shape) {
            bonusDmg = match[0].shape.bonusDmg;
        }

        let additiveScore: number = (run.character.attack + bonusDmg) * match.length;
        additiveScore *= run.character.hasReward('Combos multiply DMG') ? run.combo : 1;

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
                run.character.gold += enemy.gold;
                if (enemy.gold > 0) {
                    goldAnimation(enemy.gold);
                }
                enemy.gold = 0;
                if (run.findEnemy()?.number === run.enemyPerStage) {
                    bossFightAnimation();
                }
                sounds['enemyDefeat'].play()
            }, () => {
                run.stackCombo = false;
                run.initialShuffle = true;
                run.character.moves = run.movesPerStage;
                if (!run.winState) {
                    run.newPercDialog(dialogs, (() => {
                        updatePlayerStatsAndRewards();
                        sounds['item'].play();
                    }).bind(this))
                }
                sounds['bossDefeat'].play()
            }, () => {
                newFloorAnimation()
                if (!run.winState) {
                    run.newShopDialog(dialogs, (() => {
                        updatePlayerStatsAndRewards()
                        sounds['item'].play();
                    }).bind(this), (() => {
                        currentDialog = undefined
                        dialogs.pop();
                    }).bind(this))
                    sounds['newFloor'].play()
                }
            });
        damageAnimation(damage, overkill, position);
    }

    function damageAnimation(damage: number, overkill: boolean, positon: Position): void {
        let varianceX: number = Math.ceil(Math.random() * 50) * (Math.round(Math.random()) ? 1 : -1)
        let varianceY: number = Math.ceil(Math.random() * 50) * (Math.round(Math.random()) ? 1 : -1)

        let textAnimation: TextAnimation = new TextAnimation(
            `${damage} DMG`,
            20,
            overkill ? new Color(231, 76, 60) : new Color(224, 224, 224),
            4,
            p5Instance.CENTER,
            new Position(positon.x + varianceX, positon.y + varianceY),
            new Position(0, -200),
            180
        );

        textAnimations.push(textAnimation);
    }

    function damagePlayerAnimation(damage: number, shielded: boolean = false): void {
        let textAnimation: TextAnimation = new TextAnimation(
            shielded ? 'Shielded' : `-${damage} HP`,
            20,
            shielded ? new Color(101, 206, 80) : new Color(231, 76, 60),
            4,
            p5Instance.CENTER,
            new Position(canvas.canvasSize.x / 2, canvas.totalUiSize),
            new Position(0, 200),
            180
        );

        textAnimations.push(textAnimation);
    }

    function goldAnimation(amount: number) {
        let varianceX: number = Math.ceil(Math.random() * 50) * (Math.round(Math.random()) ? 1 : -1)
        let varianceY: number = Math.ceil(Math.random() * 50) * (Math.round(Math.random()) ? 1 : -1)

        let textAnimation: TextAnimation;
        if (amount > 0) {

            textAnimation = new TextAnimation(`+${amount} Gold`,
                20,
                new Color(244, 208, 63),
                4,
                p5Instance.CENTER,
                new Position((canvas.canvasSize.x / 2) + varianceX, (canvas.totalUiSize - canvas.uiBarSize - canvas.margin) + varianceY),
                new Position(0, 100),
                180
            );
        }

        if (amount < 0) {
            textAnimation = new TextAnimation(
                `${amount} Gold`,
                20,
                new Color(231, 76, 60),
                4,
                p5Instance.CENTER,
                new Position(p5Instance.mouseX + varianceX, p5Instance.mouseY + varianceY),
                new Position(0, 100),
                180
            );
        }

        textAnimations.push(textAnimation);
    }

    function moveSavedAnimation(): void {
        let floorComplete: TextAnimation = new TextAnimation(
            `Move saved`,
            20,
            new Color(101, 206, 80),
            4,
            p5Instance.CENTER,
            new Position(p5Instance.mouseX, p5Instance.mouseY),
            new Position(0, -200),
            240,
        );
        textAnimations.push(floorComplete);
    }

    function bossFightAnimation(): void {
        let floorComplete: TextAnimation = new TextAnimation(
            `Boss Fight`,
            60,
            new Color(87, 49, 214),
            4,
            p5Instance.CENTER,
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
            new Color(224, 224, 224),
            4,
            p5Instance.CENTER,
            new Position(canvas.canvasSize.x / 2, canvas.canvasSize.y / 2 + canvas.totalUiSize),
            new Position(0, -200),
            240
        );
        textAnimations.push(floorComplete);
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
            statsContent += '<div class="stats-ui">'

            statsContent += '<div class="stat">'
            statsContent += `<strong>Attack:</strong>&nbsp;<span>${formatNumber(run.character.attack)}</span>`
            statsContent += '</div>';

            statsContent += '<div class="stat">'
            statsContent += `<strong>Multiplier:</strong>&nbsp;<span>x${run.character.damageMultiplier}</span>`
            statsContent += '</div>';

            statsContent += '<div class="stat">'
            statsContent += `<strong>Moves:</strong>&nbsp;<span style="${run.character.moves > 5 ? 'color: white' : 'color: red'}">${run.character.moves}</span><span>&nbsp;/&nbsp;${run.movesPerStage}</span>`
            statsContent += '</div>';

            statsContent += '<div class="stat">'
            statsContent += `<strong>Defense:</strong>&nbsp;<span>${run.character.defense}</span>`
            statsContent += '</div>';

            statsContent += '<div class="stat">'
            statsContent += `<strong>Gold:</strong>&nbsp;<span>${run.character.gold}</span>`
            statsContent += '</div>';

            statsContent += '</div>';
        }

        statsContainer.innerHTML = statsContent;

        let rewardsContent: string = '';

        if (run?.character?.rewards || run?.character?.activeItem) {
            let rewardsToShow = [...run.character.rewards];

            if (run?.character?.activeItem) {
                rewardsToShow.unshift(run.character.activeItem);
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

        rewardsContainer.innerHTML = rewardsContent;

        if (run?.character?.activeItem) {
            let activeItemButton: HTMLElement = document.getElementById('activeItem');
            activeItemButton.onclick = () => {
                run.character.activeItem.effect();
                sounds['item'].play();
                updatePlayerStatsAndRewards();
            }
        }
    }
};

new P5(sketch);