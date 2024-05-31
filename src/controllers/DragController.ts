import { DragAnimation } from "../models/DragAnimation";
import { Position } from "../models/Position";
import { Run } from "../models/Run";
import { EventEmitter } from "./EventEmitter";

export class DragController extends EventEmitter {
    private static instance: DragController;

    dragAnimations: DragAnimation[];
    isDragging: boolean;

    private constructor() {
        super('DragController')
        this.dragAnimations = [];

        this.configureListeners();
    }

    static getInstance(): DragController {
        if (!DragController.instance) {
            DragController.instance = new DragController();
        }
        return DragController.instance;
    }

    get currentDragAnimation(): DragAnimation {
        return this.dragAnimations[0] ?? undefined;
    }

    configureListeners(): void {
        this.on('Main:MouseClicked:Drag', (position: Position, hasDialogOpen: boolean) => {
            if (!hasDialogOpen && this.currentDragAnimation) {
                this.currentDragAnimation.relativePositon = position;
            }
        })
    }

    add(animation: DragAnimation): void {
        this.dragAnimations.unshift(animation);
    }

    draw(run?: Run): void {
        if (run) {
            this.dragAnimations.forEach((animation: DragAnimation) => {
                animation.draw(run);
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