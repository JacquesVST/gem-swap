import { DialogType } from "../interfaces";
import { Dialog, DialogOption, ItemDialogOption } from "../models/Dialog";
import { Position } from "../models/Position";
import { Run } from "../models/Run";
import { Canvas } from "./Canvas";
import { EventEmitter } from "./EventEmitter";

export class DialogController extends EventEmitter {
    private static instance: DialogController;
    canvas: Canvas;
    dialogs: Dialog[];

    private constructor() {
        super('DialogController');
        this.dialogs = [];
        this.canvas = Canvas.getInstance();
    }

    static getInstance(): DialogController {
        if (!DialogController.instance) {
            DialogController.instance = new DialogController();
        }
        return DialogController.instance;
    }

    get currentDialog(): Dialog {
        return this.dialogs[0] ?? undefined;
    }

    configureListeners(): void {
        this.on('Main:MouseClicked:Click', (click: Position) => {
            setTimeout(() => {

                if (!this.currentDialog) {
                    return;
                }

                let selected: boolean = false;

                this.currentDialog.options.forEach((option: DialogOption) => {
                    if (option?.limits?.contains(click)) {

                        selected = true;
                        if (!option.disabled) {
                            option.action();
                            if (option instanceof ItemDialogOption && option?.item?.price) {
                                this.emit('ItemPurchased', option.item.price);
                                option.item.price = Math.floor(option.item.price * 1.25);
                            }
                            this.emit('OptionSelected', option);
                        }
                    }
                })

                if (selected) {
                    if (this.currentDialog && this.currentDialog.type !== DialogType.SHOP) {
                        this.close();
                        this.emit('DialogClosed');
                    }
                }
            }, 0);
        });
    }

    draw(run?: Run): void {
        if (this.currentDialog) {
            this.dialogs[0].draw(run);
        }
    }

    add(dialog: Dialog): void {
        this.dialogs.push(dialog);
    }

    close(): void {
        this.dialogs.shift();
    }

    clear(): void {
        this.dialogs = [];
    }

}