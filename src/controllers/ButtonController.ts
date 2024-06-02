
import { Button } from "../models/Button";
import { Position } from "../models/Position";
import { Run } from "../models/Run";
import { Canvas } from "./Canvas";
import { EventEmitter } from "./EventEmitter";

export class ButtonController extends EventEmitter {
    private static instance: ButtonController;
    canvas: Canvas;
    buttons: Button[];

    private constructor() {
        super('ButtonController');
        this.buttons = [];
        this.canvas = Canvas.getInstance();
    }

    static getInstance(): ButtonController {
        if (!ButtonController.instance) {
            ButtonController.instance = new ButtonController();
        }
        return ButtonController.instance;
    }

    configureListeners(): void {
        this.on('Main:MouseClicked:Click', (click: Position, run: Run) => {
            setTimeout(() => {
                for (let index: number = 0; index < this.buttons.length; index++) {
                    const button: Button = this.buttons[index];
                    if (button.limits.contains(click) && !button.disabled) {
                        button.action(run);
                    }
                }
            }, 0);
        });
    }

    draw(run?: Run): void {
        this.buttons.forEach((button: Button) => {
            button.draw(run);
        });
    }

    add(button: Button): void {
        this.buttons.push(button);
    }

    addAll(buttons: Button[]): void {
        this.buttons = this.buttons.concat(buttons);
    }

    remove(id: string): void {
        this.buttons = this.buttons.filter((button: Button) => button.id !== id);
    }

    clear(): void {
        this.buttons = [];
    }

}