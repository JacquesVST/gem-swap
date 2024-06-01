import './global.js';
import 'p5/lib/addons/p5.sound';
import * as p5 from 'p5';
import { Canvas } from './controllers/Canvas';
import { DialogController } from './controllers/DialogController';
import { DragController } from './controllers/DragController';
import { EventEmitter } from './controllers/EventEmitter';
import { ProgressBarController } from './controllers/ProgressBarController';
import { TextController } from './controllers/TextController';
import { IRunConfig } from './interfaces/Run';
import { Color } from './models/Color';
import { DragAnimation } from './models/DragAnimation';
import { Player } from './models/Player';
import { Position } from './models/Position';
import { Run, RunConfig } from './models/Run';
import { Item } from './models/Item.js';

const sketch = (p5Instance: p5) => {
    let run: Run;
    let canvas: Canvas;
    let eventEmitter: EventEmitter;

    let dragController: DragController;
    let textController: TextController;
    let dialogController: DialogController;
    let progressBarController: ProgressBarController

    let sounds: { [key: string]: p5.SoundFile };

    p5Instance.preload = () => {
        p5Instance.soundFormats('mp3');

        sounds = {
            bossDefeat: p5Instance.loadSound('https://raw.githubusercontent.com/JacquesVST/gem-swap/main/src/assets/boss-defeat.mp3'),
            crit: p5Instance.loadSound('https://raw.githubusercontent.com/JacquesVST/gem-swap/main/src/assets/crit.mp3'),
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

        canvas = Canvas.getInstance(p5Instance, 16, 4, 4, 20, 3, 3);
        eventEmitter = new EventEmitter('Main');

        dragController = DragController.getInstance();
        textController = TextController.getInstance();
        dialogController = DialogController.getInstance();
        progressBarController = ProgressBarController.getInstance();

        setupGame();
    }

    p5Instance.draw = () => {
        canvas.draw();
        run?.draw();

        progressBarController.draw(run);
        dialogController.draw(run);
        dragController.draw(run);
        textController.draw();
    }

    // mouse events
    p5Instance.mouseClicked = () => {
        eventEmitter.emit('MouseClicked:Click', new Position(p5Instance.mouseX, p5Instance.mouseY), run)
    }

    p5Instance.mousePressed = () => {
        let click: Position = new Position(p5Instance.mouseX, p5Instance.mouseY)
        dragController.add(new DragAnimation(click, 30))
        dragController.isDragging = true;
        eventEmitter.emit('MouseClicked', click, run)
    }

    p5Instance.mouseReleased = () => {
        dragController.isDragging = false;
        eventEmitter.emit('MouseClicked', new Position(p5Instance.mouseX, p5Instance.mouseY), run, true)
    }

    p5Instance.mouseDragged = () => {
        eventEmitter.emit('MouseClicked:Drag', new Position(p5Instance.mouseX, p5Instance.mouseY), !!dialogController.currentDialog)
    }

    // keyboard events

    p5Instance.keyPressed = (event: KeyboardEvent) => {
        eventEmitter.emit('KeyPressed', event, run)
    }

    p5Instance.keyReleased = (event: KeyboardEvent) => {
        if (event.key === 'R' || event.key === 'r' && run) {
            dialogController.clear();
            const score: number = run.score;
            run = undefined;
            setupGame('Run Restarted', score ? score : 0, Color.ORANGE);
        } else {
            eventEmitter.emit('KeyReleased', event, run);
        }
    }
    //other events
    p5Instance.windowResized = () => {
        canvas.calculateAndCreatePlayfield();
        eventEmitter.emit('WindowResized')
    }

    function setupGame(status?: string, score?: number, color?: Color, item?: Item): void {
        eventEmitter.clear();
        textController.clear();

        progressBarController.configureListeners();
        dialogController.configureListeners();
        dragController.configureListeners();

        eventEmitter.on('Run:RunEnded', (status: string, score: number, color: Color) => {
            setupGame(status, score, color);
        });

        eventEmitter.on('DialogController:SelectPassive', () => {
            dialogController.add(Run.passiveSelectorDialog());
        });

        eventEmitter.on('DialogController:PassiveChosen', (item: Item) => {
            setupGame(undefined, undefined, undefined, item)
        });

        eventEmitter.on('DialogController:DifficultyChosen', (config: RunConfig) => {
            run = new Run(config, sounds)
        });

        dialogController.add(Run.newGameDialog(status, score, color, item));
    }
};

new p5(sketch);