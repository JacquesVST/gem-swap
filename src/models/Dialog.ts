import * as P5 from "p5";
import { checkPositionInLimit, drawItem, generateId, insertLineBreaks } from "../utils/Functions";
import { CanvasInfo } from "./CanvasInfo";
import { Color } from "./Color";
import { ConfigureListeners, EventEmitter } from "./EventEmitter";
import { Item } from "./Item";
import { AnimationStatus } from "./PieceAnimation";
import { Position } from "./Position";
import { Run } from "./Run";
import { BossStage, EnemyStage, MiniBossStage } from "./Stage";

export class Dialog extends EventEmitter {
    id: string;
    title: string;
    message: string;
    options: DialogOption[];
    textColor: Color;
    type: DialogType;

    animationStatus: AnimationStatus = AnimationStatus.NOT_STARTED;
    frames: number = 0;
    velocityFade: number = 0;
    relativeFade: number = 0;

    constructor(title: string, message: string, options: DialogOption[], type: DialogType, closeCallback?: () => void, textColor?: Color) {
        super('Dialog');
        this.title = title;
        this.message = message;
        this.options = options;
        this.textColor = textColor ?? new Color(255, 255, 255);
        this.type = type
        this.id = generateId();

        this.setupAdditionalOptions(closeCallback);
    }

    get hasAdditionalButton(): boolean {
        return this.type === DialogType.SHOP || this.type === DialogType.SKIPPABLE_ITEM;
    }

    setupAdditionalOptions(closeCallback: () => void): void {
        if (this.type === DialogType.SHOP) {
            this.options.push(new DefaultDialogOption(
                () => {
                    if (closeCallback) {
                        closeCallback();
                    }
                },
                new Color(86, 101, 115),
                'Close'
            ));
        }

        if (this.type === DialogType.SKIPPABLE_ITEM) {
            this.options.push(new DefaultDialogOption(
                () => {
                    if (closeCallback) {
                        closeCallback();
                    }
                },
                new Color(86, 101, 115),
                'Skip'
            ));
        }
    }

    draw(canvas: CanvasInfo, run?: Run): void {
        if (this.animationStatus === AnimationStatus.NOT_STARTED) {
            this.setupAnimation();
        }

        let dimension: Position = new Position(0, 0);
        let margin: Position = new Position(0, 0);

        let textOffset: number = 0;

        let textMarginCount: number = 8;
        let optionsLength: number = this.hasAdditionalButton ? this.options.length - 1 : this.options.length;
        let lengthOffSet: number = 5;

        optionsLength = optionsLength === 1 ? 2 : optionsLength;

        dimension.x = (optionsLength > lengthOffSet ? lengthOffSet : optionsLength) * canvas.itemSideSize + (((optionsLength > lengthOffSet ? lengthOffSet : optionsLength) + 1) * canvas.margin);
        margin.x = (canvas.playfield.x / 2) - (dimension.x / 2);

        dimension.y = (Math.ceil(optionsLength / lengthOffSet) * canvas.itemSideSize) + ((Math.ceil(optionsLength / lengthOffSet) + textMarginCount) * canvas.margin) + (this.hasAdditionalButton ? canvas.margin + (canvas.itemSideSize / 4) : 0);
        margin.y = (canvas.playfield.y / 2) - (dimension.y / 2);

        textOffset = margin.y + (textMarginCount * canvas.margin / 2);

        this.drawDialogBackground(dimension, margin, textOffset, canvas);
        this.drawOptions(lengthOffSet, dimension, margin, canvas, run);
    }


    drawDialogBackground(dimension: Position, margin: Position, textOffset: number, canvas: CanvasInfo): void {
        const p5: P5 = canvas.p5;

        p5.noStroke();
        p5.fill([...new Color(40, 40, 40).value, 255 + this.relativeFade]);
        p5.rect(
            margin.x,
            margin.y,
            dimension.x,
            dimension.y,
            canvas.radius * 4
        );

        p5.textAlign(p5.CENTER, p5.CENTER)

        p5.fill([...this.textColor.value, 255 + this.relativeFade]);
        p5.stroke(0, 0, 0, 255 + this.relativeFade);
        p5.strokeWeight(3);
        p5.textSize(24)
        p5.text(
            this.title,
            canvas.playfield.x / 2,
            textOffset - canvas.margin
        );

        p5.fill(200, 200, 200, 255 + this.relativeFade);
        p5.textSize(16)
        p5.strokeWeight(2);
        p5.text(
            this.message,
            canvas.playfield.x / 2,
            textOffset + canvas.margin
        );
    }

    drawOptions(lengthOffSet: number, dimension: Position, margin: Position, canvas: CanvasInfo, run?: Run): void {
        const p5: P5 = canvas.p5;

        this.options.forEach((option: DialogOption, index: number) => {

            // option frame
            let cumulativeMarginX: number = margin.x + (index % lengthOffSet * (canvas.itemSideSize + canvas.margin)) + canvas.margin;
            let cumulativeMarginY: number = margin.y + (Math.floor(index / lengthOffSet) * (canvas.itemSideSize + canvas.margin)) + (canvas.margin * 8);

            cumulativeMarginX = this.options.length === (this.hasAdditionalButton ? 2 : 1) ? canvas.playfield.x / 2 - (canvas.itemSideSize / 2) : cumulativeMarginX;

            let optionWidth: number = canvas.itemSideSize;
            let optionHeight: number = canvas.itemSideSize;

            if (this.hasAdditionalButton && index === this.options.length - 1) {
                optionWidth = (canvas.itemSideSize * 2) + canvas.margin;
                optionHeight = canvas.itemSideSize / 4;

                cumulativeMarginX = canvas.playfield.x / 2 - (optionWidth / 2);
                cumulativeMarginY = margin.y + dimension.y - canvas.margin - optionHeight;
            }

            let limits: number[] = [
                cumulativeMarginX,
                cumulativeMarginX + optionWidth,
                cumulativeMarginY,
                cumulativeMarginY + optionHeight
            ];

            option.limits = limits;

            let isMouseOver: boolean = checkPositionInLimit(new Position(p5.mouseX, p5.mouseY), ...limits)

            let opacity: number = (isMouseOver ? 255 : 200) + this.relativeFade

            if (!(option instanceof ItemDialogOption)) {
                p5.noStroke();
                p5.fill(...(option.disabled ? new Color(86, 101, 115).value : option.color.value), opacity <= 0 ? 0 : opacity);
                p5.rect(
                    cumulativeMarginX,
                    cumulativeMarginY,
                    optionWidth,
                    optionHeight,
                    canvas.radius * 2
                );
            }

            // option content
            if (option instanceof DefaultDialogOption) {
                p5.textAlign(p5.CENTER, p5.CENTER)

                let textMargin: number = cumulativeMarginY + (optionHeight / 2);
                let mainOffset: number = (option.subsubtext ? -2 : option.subtext ? -1 : 0) * canvas.margin;

                p5.fill(255, 255, 255, 255 + this.relativeFade);
                p5.stroke(0, 0, 0, 255 + this.relativeFade);
                p5.strokeWeight(3);
                p5.textSize(20)
                p5.text(
                    option.text,
                    cumulativeMarginX + (optionWidth / 2),
                    textMargin + mainOffset
                );

                if (option.subtext) {
                    let subOffset: number = (option.subsubtext ? 0 : 1) * canvas.margin;

                    p5.fill(200, 200, 200, 255 + this.relativeFade);
                    p5.strokeWeight(2);
                    p5.textSize(16)
                    p5.text(
                        insertLineBreaks(option.subtext, p5.map(optionWidth - canvas.margin, 0, p5.textWidth(option.subtext), 0, option.subtext.length)),
                        cumulativeMarginX + (optionWidth / 2),
                        textMargin + subOffset
                    );
                }

                if (option.subsubtext) {
                    p5.fill(200, 200, 200, 255 + this.relativeFade);
                    p5.strokeWeight(2);
                    p5.textSize(16)
                    p5.text(
                        insertLineBreaks(option.subsubtext, p5.map(optionWidth - canvas.margin, 0, p5.textWidth(option.subsubtext), 0, option.subsubtext.length)),
                        cumulativeMarginX + (optionWidth / 2),
                        textMargin + (2 * canvas.margin)
                    );
                }
            }

            if (option instanceof NavigationDialogOption) {
                p5.textAlign(p5.CENTER, p5.CENTER)

                let text: string = 'Common Stage';
                let subtext: string = `${option.stage.enemies.length} enemies`;

                if (option.stage instanceof BossStage) {
                    text = 'Boss Stage';
                    subtext = `${option.stage.enemies.length - 1} enemies and your final challenge`;
                }

                if (option.stage instanceof MiniBossStage) {
                    text = 'Mini Boss Stage';
                    subtext = `${option.stage.enemies.length} Strong Enemies`;
                }

                let textMargin: number = cumulativeMarginY + (optionHeight / 2);
                p5.fill(255, 255, 255, 255 + this.relativeFade);
                p5.stroke(0, 0, 0, 255 + this.relativeFade);
                p5.strokeWeight(3);
                p5.textSize(20)
                p5.text(
                    text,
                    cumulativeMarginX + (optionWidth / 2),
                    textMargin - canvas.margin
                );

                if (subtext) {
                    p5.fill(200, 200, 200, 255 + this.relativeFade);
                    p5.strokeWeight(2);
                    p5.textSize(16)
                    p5.text(
                        insertLineBreaks(subtext, p5.map(optionWidth - canvas.margin, 0, p5.textWidth(subtext), 0, subtext.length)),
                        cumulativeMarginX + (optionWidth / 2),
                        textMargin + canvas.margin
                    );
                }
            }

            if (option instanceof ItemDialogOption) {
                drawItem(option.item, cumulativeMarginX, cumulativeMarginY, canvas.itemSideSize, canvas, this.relativeFade, run, option);
            }

        });

        if (this.animationStatus === AnimationStatus.IN_PROGRESS) {
            this.updateAnimationDeltas();
        }
    }

    setupAnimation(): void {
        this.animationStatus = AnimationStatus.IN_PROGRESS;
        this.frames = 15;
        this.relativeFade = -255;
        this.velocityFade = this.relativeFade / this.frames;
    }

    updateAnimationDeltas(): void {
        if (this.frames) {
            this.relativeFade -= this.velocityFade;

            this.frames--;
            if (this.frames === 0) {
                this.relativeFade = 0;
                this.velocityFade = 0;
                this.animationStatus = AnimationStatus.FINISHED;
            }
        }
    }
}

export enum DialogType {
    CHOICE,
    ITEM,
    NAVIGATION,
    SHOP,
    SKIPPABLE_ITEM,
}

export class DialogOption {
    action: () => void;
    color: Color;
    disabled: boolean;
    limits: number[];

    constructor(action: () => void, color: Color) {
        this.action = action;
        this.color = color;
    }
}

export class ItemDialogOption extends DialogOption {
    item: Item;

    constructor(action: () => void, color: Color, item: Item) {
        super(action, color)
        this.item = item;
    }

    static itemListToDialogOption(items: Item[], run: Run, callback?: () => void): ItemDialogOption[] {
        return items.map(
            (item: Item) => {
                return new ItemDialogOption(
                    () => {
                        if (item.isActive) {

                            if (run.player.hasItem('Extra Active Item')) {
                                if (run.player.activeItem === undefined) {
                                    run.player.activeItem = item;
                                } else if (run.player.activeItem2 === undefined) {
                                    run.player.activeItem2 = item;
                                } else {
                                    let aux: Item;
                                    aux = run.player.activeItem2;
                                    run.player.activeItem2 = item;
                                    run.player.activeItem = aux;
                                }
                            } else {
                                run.player.activeItem = item;
                            }
                        } else {
                            item.effect();
                            run.player.items.push(item);
                        }
                        if (callback) {
                            callback();
                        }
                    },
                    Item.rarityColors()[item.rarity].color,
                    item,
                )
            });
    }
}

export class DefaultDialogOption extends DialogOption {
    text: string;
    subtext: string;
    subsubtext: string;

    constructor(action: () => void, color: Color, text: string, subtext?: string, subsubtext?: string) {
        super(action, color)
        this.text = text;
        this.subtext = subtext;
        this.subsubtext = subsubtext;
    }
}

export class NavigationDialogOption extends DialogOption {
    stage: EnemyStage;
    index: number;

    constructor(action: () => void, color: Color, stage: EnemyStage, index: number) {
        super(action, color)
        this.stage = stage;
        this.index = index;
    }
}

export class DialogController extends EventEmitter implements ConfigureListeners {
    private static instance: DialogController;
    canvas: CanvasInfo;
    dialogs: Dialog[];

    private constructor() {
        super('DialogController');
        this.dialogs = [];
        this.canvas = CanvasInfo.getInstance();
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
        this.on('Main:MouseClicked:Click', (position: Position, run?: Run) => {
            setTimeout(() => {

                if (!this.currentDialog) {
                    return;
                }

                let selected: boolean = false;

                this.currentDialog.options.forEach((option: DialogOption) => {
                    if (option?.limits && checkPositionInLimit(position, ...option.limits)) {

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
            this.dialogs[0].draw(this.canvas, run);
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