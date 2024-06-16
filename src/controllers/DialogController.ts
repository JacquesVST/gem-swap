import * as p5 from "p5";
import { DialogType } from "../interfaces";
import { Dialog, DialogOption, ItemDialogOption, RunConfigDialogField } from "../models/Dialog";
import { Position } from "../models/Position";
import { Run } from "../models/Run";
import { UpgradeOption } from "../models/Upgrade";
import { setUpgrades } from "../utils/LocalStorage";
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
        this.on('Main:MouseClicked:Click', (click: Position, run: Run, sounds: { [key: string]: p5.SoundFile }) => {
            setTimeout(() => {

                if (!this.currentDialog) {
                    return;
                }
                const id: string = this.currentDialog.id;

                let selected: boolean = false;

                if (this.currentDialog.type === DialogType.UPGRADES) {
                    this.currentDialog.upgrade.options.forEach((option: UpgradeOption) => {
                        if (option.limitsSub.contains(click)) {
                            if (option.points > 0) {
                                option.points--;
                                sounds['dot'].play();
                            }
                        }

                        if (option.limitsAdd?.contains(click)) {
                            if (this.currentDialog.upgrade.canAfford(option)) {
                                option.points++;
                                sounds['dot'].play();
                            }
                        }
                    });

                    if (this.currentDialog.upgrade.resetLimits?.contains(click)) {
                        this.currentDialog.upgrade.reset();
                        sounds['dot'].play();
                    }

                    setUpgrades(this.currentDialog.upgrade);
                }

                this.currentDialog.options.forEach((option: DialogOption) => {
                    if (option?.limits?.contains(click)) {


                        if (!option.disabled) {
                            selected = true;
                            if (this.currentDialog.type === DialogType.CUSTOM_RUN) {
                                option.action(this.currentDialog.optionsAsRunConfig)
                            } else {
                                option.action();
                            }
                            if (option instanceof ItemDialogOption && option?.item?.price) {
                                this.emit('ItemPurchased', option.item.price);
                                option.item.price = Math.floor(option.item.price * 1.25);
                            }
                            this.emit('OptionSelected', option, id);
                        }

                    }
                })

                if (selected) {
                    if (this.currentDialog && this.currentDialog.type !== DialogType.SHOP) {
                        this.close(id);
                        this.emit('DialogClosed', id);
                    }
                }

                if (this.currentDialog?.rerollButton?.contains(click) && run.player.itemData.rerolls > 0) {
                    this.emit('Reroll', this.currentDialog)
                }
            }, 0);
        });


        this.on('Main:MouseClicked:Drag', (position: Position, hasDialogOpen: boolean) => {
            if (hasDialogOpen && this.currentDialog.type === DialogType.CUSTOM_RUN) {
                this.currentDialog.customRunOptions.forEach((options: RunConfigDialogField) => {
                    if (options.limits?.contains(position)) {
                        options.currentValue = this.canvas.p5.map(
                            position.x,
                            options.limits.min.x,
                            options.limits.max.x,
                            options.minValue,
                            options.maxValue,
                            true
                        )
                    }
                })
            }
        })
    }

    draw(run?: Run): void {
        if (this.currentDialog) {
            this.dialogs[0].draw(run);
        }
    }

    add(dialog: Dialog): void {
        this.dialogs.push(dialog);
    }

    close(id?: string): void {
        if (id) {
            this.dialogs = this.dialogs.filter((dialog: Dialog) => dialog.id !== id);
        } else {
            this.dialogs.shift();
        }
    }

    clear(): void {
        this.dialogs = [];
    }

}