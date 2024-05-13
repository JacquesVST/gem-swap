import './global.js';
import 'p5/lib/addons/p5.sound';
import * as p5 from 'p5';
import { CanvasInfo } from "./models/CanvasInfo";
import { Character } from "./models/Character";
import { DialogController } from "./models/Dialog";
import { Grid } from "./models/Grid";
import { Position } from "./models/Position";
import { BestNumbers, Run, RunConfig } from "./models/Run";
import { TextAnimationController } from "./models/TextAnimation";
import { getBestNumbers } from './utils/Functions.js';

const sketch = (p5Instance: p5) => {
    let run: Run;
    let canvas: CanvasInfo;
    let textAnimationController: TextAnimationController;
    let dialogController: DialogController;

    let sounds: { [key: string]: p5.SoundFile };
    let controls: { [key: string]: HTMLElement };

    p5Instance.preload = () => {
        p5Instance.soundFormats('mp3');

        sounds = {
            bossDefeat: p5Instance.loadSound('https://raw.githubusercontent.com/JacquesVST/gem-swap/main/src/assets/boss-defeat.mp3'),
            defeat: p5Instance.loadSound('https://raw.githubusercontent.com/JacquesVST/gem-swap/main/src/assets/defeat.mp3'),
            enemyDefeat: p5Instance.loadSound('https://raw.githubusercontent.com/JacquesVST/gem-swap/main/src/assets/enemy-defeat.mp3'),
            item: p5Instance.loadSound('https://raw.githubusercontent.com/JacquesVST/gem-swap/main/src/assets/item.mp3'),
            match: p5Instance.loadSound('https://raw.githubusercontent.com/JacquesVST/gem-swap/main/src/assets/match.mp3'),
            move: p5Instance.loadSound('https://raw.githubusercontent.com/JacquesVST/gem-swap/main/src/assets/move.mp3'),
            newFloor: p5Instance.loadSound('https://raw.githubusercontent.com/JacquesVST/gem-swap/main/src/assets/new-floor.mp3'),
            noMove: p5Instance.loadSound('https://raw.githubusercontent.com/JacquesVST/gem-swap/main/src/assets/no-move.mp3'),
            select: p5Instance.loadSound('https://raw.githubusercontent.com/JacquesVST/gem-swap/main/src/assets/generic.mp3')
        }

    }

    p5Instance.setup = () => {
        p5Instance.textFont('Open Sans');

        controls = {
            bestComboCounter: document.getElementById('bestComboCounter'),
            bestDamageCounter: document.getElementById('bestDamageCounter'),
            bestScoreCounter: document.getElementById('bestScoreCounter'),
            comboCounter: document.getElementById('comboCounter'),
            damageCounter: document.getElementById('damageCounter'),
            rewardsContainer: document.getElementById('rewardsContainer'),
            runInfo: document.getElementById('runInfo'),
            scoreCounter: document.getElementById('scoreCounter'),
            statsContainer: document.getElementById('statsContainer'),
        }

        let bests: BestNumbers = getBestNumbers();

        controls.bestScoreCounter.innerHTML = bests.bestScore + '';
        controls.bestComboCounter.innerHTML = bests.bestCombo + '';
        controls.bestDamageCounter.innerHTML = bests.bestDamage + '';

        canvas = new CanvasInfo(p5Instance, 16, 4, 4, 20, 4, 2);

        setupGame();
    }

    p5Instance.draw = () => {
        canvas.drawPlayfield();

        run?.drawProgressBars()
        run?.grid.draw(canvas, p5Instance, !!dialogController.currentDialog);
        run?.grid.drawItems(p5Instance);

        dialogController.draw(run);
        textAnimationController.draw();
    }

    p5Instance.mouseClicked = () => {
        let click: Position = new Position(p5Instance.mouseX, p5Instance.mouseY)
        if (!dialogController.currentDialog) {
            if (run) {
                run.grid.mouseClickedGrid(click, run)
            }
        } else {
            dialogController.mouseClickedDialog(click, run);
        }
    }

    function setupGame(): void {
        textAnimationController = new TextAnimationController(canvas);
        dialogController = new DialogController(canvas);

        if (run) {
            run = undefined;
        }

        Run.newGameDialog(canvas, dialogController, (config: RunConfig) => {
            run = new Run(p5Instance, Character.defaultCharacter(), config, textAnimationController, dialogController)
            run.grid = new Grid(config.gridX, config.gridY, canvas);
            run.canvas = canvas;
            run.sounds = sounds;
            run.controls = controls;
            run.setupGame = () => {
                setupGame();
            }

            console.log(run.map.branchingFloors)

            run.newInitialRewardDialog(() => {
                run.updateScore([]);
                run.updateCombo([]);
                run.updateDamage(0);
                run.updatePlayerStatsAndRewards();
                run.updateBottomProgressBars();

                run.grid.init(run, () => {
                    run.grid.applyCriticalInBoard();
                });
            });
        });
    }
};

new p5(sketch);