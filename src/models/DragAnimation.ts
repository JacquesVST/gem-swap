import * as P5 from "p5";
import { dottedLine, generateId } from "../utils/Functions";
import { CanvasInfo } from "./CanvasInfo";
import { ConfigureListeners, EventEmitter } from "./EventEmitter";
import { Position } from "./Position";
import { Run } from "./Run";

export class DragAnimation {
    id: string;
    canvas: CanvasInfo;
    initialPosition: Position;
    finalPosition: Position;
    frames: number = 0;
    fade: number = 255;
    velocityFade: number = 0;
    isFading: boolean = false;

    constructor(initialPosition: Position, frames: number) {
        this.initialPosition = initialPosition
        this.frames = frames;
        this.canvas = CanvasInfo.getInstance();
        this.id = generateId();

        this.calculateVelocity();
    }

    calculateVelocity(): void {
        this.velocityFade = this.fade / this.frames;
    }

    draw(run: Run, dragAnimationController: DragAnimationController, isDragging: boolean): void {
        let p5: P5 = run.canvas.p5
        if (this.finalPosition && this.finalPosition.checksum !== this.initialPosition.checksum) {

            p5.strokeWeight(3);
            p5.stroke(0, 0, 0, this.fade);
            p5.fill(255, 255, 255, this.fade);

            let size: number = run.canvas.cellSideSize / 6;
            let dots: number = dottedLine(this.initialPosition, this.finalPosition, size, size * 1.25, p5);

            if (dots !== run.dots && this.fade === 255) {
                run.dots = dots;
                run.sounds['dot'].setVolume(0.2);
                run.sounds['dot'].play();
            }

            if (!isDragging || this.isFading) {
                this.isFading = true;
                this.updatePosition(dragAnimationController);
            }
        }
    }

    updatePosition(dragAnimationController: DragAnimationController): void {
        this.fade -= this.velocityFade;

        if (this.frames-- === 0) {
            dragAnimationController.remove(this);
        }
    }
}

export class DragAnimationController extends EventEmitter implements ConfigureListeners {
    private static instance: DragAnimationController;

    dragAnimations: DragAnimation[];
    isDragging: boolean;

    private constructor() {
        super('DragAnimationController')
        this.dragAnimations = [];

        this.configureListeners();
    }

    static getInstance(): DragAnimationController {
        if (!DragAnimationController.instance) {
            DragAnimationController.instance = new DragAnimationController();
        }
        return DragAnimationController.instance;
    }

    get currentDragAnimation(): DragAnimation {
        return this.dragAnimations[0] ?? undefined;
    }

    configureListeners(): void {
        this.on('Main:MouseClicked:Drag', (position: Position, hasDialogOpen: boolean) => {
            if (!hasDialogOpen && this.currentDragAnimation) {
                this.currentDragAnimation.finalPosition = position;
            }
        })
    }

    add(animation: DragAnimation): void {
        this.dragAnimations.unshift(animation);
    }

    draw(run?: Run): void {
        if (run) {
            this.dragAnimations.forEach((animation: DragAnimation) => {
                animation.draw(run, this, this.isDragging);
            });
        }
    }

    clear(): void {
        this.dragAnimations = [];
    }

    remove(dragAnimation: DragAnimation): void {
        this.dragAnimations = this.dragAnimations.filter((animation: DragAnimation) => animation.id !== dragAnimation.id);
    }
}