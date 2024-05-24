import './global.js';
import 'p5/lib/addons/p5.sound';
import * as p5 from 'p5';
import { CanvasInfo } from "./models/CanvasInfo";
import { Character } from "./models/Character";
import { Color } from './models/Color.js';
import { DialogController } from "./models/Dialog";
import { DragAnimation, DragAnimationController } from './models/DragAnimation';
import { EventEmitter } from './models/EventEmitter.js';
import { Position } from "./models/Position";
import { BestNumbers, Run, RunConfig } from "./models/Run";
import { TextAnimationController } from "./models/TextAnimation";
import { formatNumber, getBestNumbers } from './utils/Functions';

const sketch = (p5Instance: p5) => {
    let run: Run;
    let canvas: CanvasInfo;
    let dragAnimationController: DragAnimationController;
    let textAnimationController: TextAnimationController;
    let dialogController: DialogController;
    let eventEmitter: EventEmitter;

    let sounds: { [key: string]: p5.SoundFile };
    let controls: { [key: string]: HTMLElement };

    p5Instance.preload = () => {
        p5Instance.soundFormats('mp3');

        sounds = {
            bossDefeat: p5Instance.loadSound('https://raw.githubusercontent.com/JacquesVST/gem-swap/main/src/assets/boss-defeat.mp3'),
            defeat: p5Instance.loadSound('https://raw.githubusercontent.com/JacquesVST/gem-swap/main/src/assets/defeat.mp3'),
            dot: p5Instance.loadSound('https://raw.githubusercontent.com/JacquesVST/gem-swap/main/src/assets/dot.mp3'),
            enemyDefeat: p5Instance.loadSound('https://raw.githubusercontent.com/JacquesVST/gem-swap/main/src/assets/enemy-defeat.mp3'),
            generic: p5Instance.loadSound('https://raw.githubusercontent.com/JacquesVST/gem-swap/main/src/assets/select.mp3'),
            item: p5Instance.loadSound('https://raw.githubusercontent.com/JacquesVST/gem-swap/main/src/assets/item.mp3'),
            match: p5Instance.loadSound('https://raw.githubusercontent.com/JacquesVST/gem-swap/main/src/assets/match.mp3'),
            move: p5Instance.loadSound('https://raw.githubusercontent.com/JacquesVST/gem-swap/main/src/assets/move.mp3'),
            newFloor: p5Instance.loadSound('https://raw.githubusercontent.com/JacquesVST/gem-swap/main/src/assets/new-floor.mp3'),
            noMove: p5Instance.loadSound('https://raw.githubusercontent.com/JacquesVST/gem-swap/main/src/assets/no-move.mp3'),
            select: p5Instance.loadSound('https://raw.githubusercontent.com/JacquesVST/gem-swap/main/src/assets/generic.mp3'),
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
            itemsContainer: document.getElementById('itemsContainer'),
            runInfo: document.getElementById('runInfo'),
            scoreCounter: document.getElementById('scoreCounter'),
            statsContainer: document.getElementById('statsContainer'),
        }

        let bests: BestNumbers = getBestNumbers();

        controls.bestScoreCounter.innerHTML = formatNumber(bests.bestScore);
        controls.bestComboCounter.innerHTML = formatNumber(bests.bestCombo);
        controls.bestDamageCounter.innerHTML = formatNumber(bests.bestDamage);

        canvas = CanvasInfo.getInstance(p5Instance, 16, 4, 4, 20, 3, 2);
        dragAnimationController = DragAnimationController.getInstance();
        textAnimationController = TextAnimationController.getInstance();
        dialogController = DialogController.getInstance();
        eventEmitter = new EventEmitter();

        setupGame();
    }

    p5Instance.draw = () => {
        canvas.draw();

        run?.draw();
        dialogController.draw(run);
        dragAnimationController.draw(run);
        textAnimationController.draw();
    }

    p5Instance.mouseClicked = () => {
        eventEmitter.emit('MouseClicked:Click', new Position(p5Instance.mouseX, p5Instance.mouseY), run)
    }

    p5Instance.mousePressed = () => {
        let click: Position = new Position(p5Instance.mouseX, p5Instance.mouseY)
        dragAnimationController.add(new DragAnimation(click, 30))
        dragAnimationController.isDragging = true;
        eventEmitter.emit('MouseClicked', click, run)
    }

    p5Instance.mouseReleased = () => {
        dragAnimationController.isDragging = false;
        eventEmitter.emit('MouseClicked', new Position(p5Instance.mouseX, p5Instance.mouseY), run, true)
    }

    p5Instance.mouseDragged = () => {
        eventEmitter.emit('MouseClicked:Drag', new Position(p5Instance.mouseX, p5Instance.mouseY), !!dialogController.currentDialog)
    }

    function setupGame(status?: string, score?: number, color?: Color): void {
        eventEmitter.clear();
        textAnimationController.clear();

        dialogController.configureListeners();
        dragAnimationController.configureListeners();

        eventEmitter.on('Run:RunEnded', (status: string, score: number, color: Color) => {
            setupGame(status, score, color);
        });

        eventEmitter.on('DialogController:DifficultyChosen', (config: RunConfig) => {
            run = new Run(p5Instance, Character.defaultCharacter(), config, sounds, controls)
        });

        dialogController.add(Run.newGameDialog(status, score, color));
    }
};

new p5(sketch);