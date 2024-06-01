import * as P5 from "p5";
import { Canvas } from "../controllers/Canvas";
import { AnimationStatus, DialogType, Frequency, ICanvas, IDialog, IDialogOption } from "../interfaces";
import { drawItem } from "../utils/Draw";
import { generateId, insertLineBreaks } from "../utils/General";
import { Color } from "./Color";
import { Item } from "./Item";
import { Limits } from "./Limits";
import { Position } from "./Position";
import { Run } from "./Run";
import { BossStage, CommonEnemyStage, ItemStage, MiniBossStage, ShopStage, Stage } from "./Stage";

export class Dialog implements IDialog {
    id: string;
    title: string;
    message: string;
    options: DialogOption[];
    textColor: Color;
    type: DialogType;

    animationStatus: AnimationStatus = AnimationStatus.NOT_STARTED;
    frames: number = 0;

    initialOpacity?: number = 0;
    relativeOpacity?: number = 0;
    relativeOpacitySpeed?: number = 0;


    constructor(title: string, message: string, options: DialogOption[], type: DialogType, closeCallback?: (id?: string) => void, textColor?: Color) {
        this.title = title;
        this.message = message;
        this.options = options;
        this.textColor = textColor ?? new Color(255, 255, 255);
        this.type = type
        this.id = generateId();

        this.setupAdditionalOptions(closeCallback);
    }

    get hasAdditionalButton(): boolean {
        return this.type === DialogType.SHOP || this.type === DialogType.SKIPPABLE_ITEM || this.type === DialogType.INITIAL;
    }

    setupAdditionalOptions(closeCallback: (id?: string) => void): void {
        if (this.type === DialogType.SHOP) {
            this.options.push(new DefaultDialogOption(
                () => {
                    if (closeCallback) {
                        closeCallback(this.id);
                    }
                },
                Color.DISABLED,
                'Close'
            ));
        }

        if (this.type === DialogType.SKIPPABLE_ITEM) {
            this.options.push(new DefaultDialogOption(
                () => {
                    if (closeCallback) {
                        closeCallback(this.id);
                    }
                },
                Color.DISABLED,
                'Skip'
            ));
        }

    }

    draw(run?: Run): void {
        const canvas: ICanvas = Canvas.getInstance();
        if (this.animationStatus === AnimationStatus.NOT_STARTED) {
            this.calculateSpeed();
        }

        const dimension: Position = new Position(0, 0);
        const margin: Position = new Position(0, 0);
        const textMarginCount: number = 8;
        const lengthOffSet: number = 5;


        let optionsLength: number = this.hasAdditionalButton ? this.options.length - 1 : this.options.length;

        optionsLength = optionsLength === 1 ? 2 : optionsLength;

        dimension.x = (optionsLength > lengthOffSet ? lengthOffSet : optionsLength) * canvas.itemSideSize + (((optionsLength > lengthOffSet ? lengthOffSet : optionsLength) + 1) * canvas.margin);
        margin.x = (canvas.playfield.x / 2) - (dimension.x / 2);

        dimension.y = (Math.ceil(optionsLength / lengthOffSet) * canvas.itemSideSize) + ((Math.ceil(optionsLength / lengthOffSet) + textMarginCount) * canvas.margin) + (this.hasAdditionalButton ? canvas.margin + (canvas.itemSideSize / 4) : 0);
        margin.y = (canvas.playfield.y / 2) - (dimension.y / 2);

        if (this.type === DialogType.INITIAL) {
            dimension.y += canvas.itemSideSize / 4
            margin.y = (canvas.playfield.y / 2) - (dimension.y / 2);
        }

        const textOffset: number = margin.y + (textMarginCount * canvas.margin / 2);

        this.drawDialogBackground(dimension, margin, textOffset);
        this.drawOptions(lengthOffSet, dimension, margin, run);
    }


    drawDialogBackground(dimension: Position, margin: Position, textOffset: number): void {
        const canvas: ICanvas = Canvas.getInstance();
        const p5: P5 = canvas.p5;

        const opacity: number = this.initialOpacity + this.relativeOpacity;

        p5.noStroke();
        p5.fill(Color.GRAY_2.alpha(opacity).value);
        p5.rect(
            margin.x,
            margin.y,
            dimension.x,
            dimension.y,
            canvas.radius * 4
        );

        p5.textAlign(p5.CENTER, p5.CENTER);

        p5.fill(this.textColor.alpha(opacity).value);
        p5.stroke(Color.BLACK.alpha(opacity).value);
        p5.strokeWeight(3);
        p5.textSize(24)
        p5.text(
            this.title,
            canvas.playfield.x / 2,
            textOffset - canvas.margin
        );

        p5.fill(Color.WHITE_1.alpha(opacity).value);
        p5.textSize(16)
        p5.strokeWeight(2);
        p5.text(
            this.message,
            canvas.playfield.x / 2,
            textOffset + canvas.margin
        );
    }

    drawOptions(lengthOffSet: number, dimension: Position, margin: Position, run?: Run): void {
        const canvas: ICanvas = Canvas.getInstance();
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

                if (this.type === DialogType.INITIAL) {
                    optionWidth = canvas.itemSideSize
                    optionHeight = canvas.itemSideSize / 2;

                    cumulativeMarginX = canvas.playfield.x / 2 - optionWidth / 2;
                    cumulativeMarginY = margin.y + dimension.y - canvas.margin - optionHeight;
                }
            }

            option.limits = new Limits(new Position(cumulativeMarginX, cumulativeMarginY), new Position(cumulativeMarginX + optionWidth, cumulativeMarginY + optionHeight));

            const isMouseOver: boolean = option.limits.contains(canvas.mousePosition)

            const opacityHightlight: number = (isMouseOver ? 255 : 200) + this.relativeOpacity

            if (!(option instanceof ItemDialogOption) && !(option instanceof PassiveDialogOption)) {
                p5.noStroke();
                p5.fill((option.disabled ? new Color(86, 101, 115) : option.color).alpha(opacityHightlight <= 0 ? 0 : opacityHightlight).value);
                p5.rect(
                    cumulativeMarginX,
                    cumulativeMarginY,
                    optionWidth,
                    optionHeight,
                    canvas.radius * 2
                );
            }

            const opacity: number = this.initialOpacity + this.relativeOpacity;

            // option content
            if (option instanceof DefaultDialogOption) {
                p5.textAlign(p5.CENTER, p5.CENTER)

                const textMargin: number = cumulativeMarginY + (optionHeight / 2);
                const mainOffset: number = (option.subsubtext ? -2 : option.subtext ? -1 : 0) * canvas.margin;

                p5.fill(Color.WHITE.alpha(opacity).value);
                p5.stroke(Color.BLACK.alpha(opacity).value);
                p5.strokeWeight(3);
                p5.textSize(20)
                p5.text(
                    option.text,
                    cumulativeMarginX + (optionWidth / 2),
                    textMargin + mainOffset
                );

                if (option.subtext) {
                    let subOffset: number = (option.subsubtext ? 0 : 1) * canvas.margin;

                    p5.fill(Color.WHITE_1.alpha(opacity).value);
                    p5.strokeWeight(2);
                    p5.textSize(16)
                    p5.text(
                        insertLineBreaks(option.subtext, p5.map(optionWidth - canvas.margin, 0, p5.textWidth(option.subtext), 0, option.subtext.length)),
                        cumulativeMarginX + (optionWidth / 2),
                        textMargin + subOffset
                    );
                }

                if (option.subsubtext) {
                    p5.fill(Color.WHITE_1.alpha(opacity).value);
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

                let text: string;
                let subtext: string;

                if (option.stage instanceof CommonEnemyStage) {
                    text = 'Common Stage';
                    subtext = `${option.stage.enemies.length} enemies`;
                }

                if (option.stage instanceof BossStage) {
                    text = 'Boss Stage';
                    subtext = `${option.stage.enemies.length - 1} enemies and your final challenge`;
                }

                if (option.stage instanceof MiniBossStage) {
                    text = 'Mini Boss Stage';
                    subtext = `${option.stage.enemies.length} Strong Enemies`;
                }

                if (option.stage instanceof ItemStage) {
                    text = 'Item Stage';
                    subtext = `A free item to help you`;
                }

                if (option.stage instanceof ShopStage) {
                    text = 'Shop Stage';
                    subtext = `Take only what you can afford`;
                }

                const textMargin: number = cumulativeMarginY + (optionHeight / 2);
                p5.fill(Color.WHITE.alpha(opacity).value);
                p5.stroke(Color.BLACK.alpha(opacity).value);
                p5.strokeWeight(3);
                p5.textSize(20)
                p5.text(
                    text,
                    cumulativeMarginX + (optionWidth / 2),
                    textMargin - canvas.margin
                );

                if (subtext) {
                    p5.fill(Color.WHITE_1.alpha(opacity).value);
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
                drawItem(option.item, cumulativeMarginX, cumulativeMarginY, canvas.itemSideSize, canvas.itemSideSize, this.relativeOpacity, run, option);
            }

            if (option instanceof PassiveDialogOption) {
                (p5.drawingContext as CanvasRenderingContext2D).setLineDash([10, 10]);

                p5.fill(Color.GRAY_3.alpha(opacityHightlight).value);
                p5.rect(
                    cumulativeMarginX,
                    cumulativeMarginY,
                    canvas.itemSideSize,
                    canvas.itemSideSize / 2,
                    canvas.radius
                );

                (p5.drawingContext as CanvasRenderingContext2D).setLineDash([]);

                if (!option.item) {
                    p5.fill(Color.WHITE.alpha(opacity).value);
                    p5.stroke(Color.BLACK.alpha(opacity).value);
                    p5.strokeWeight(3);
                    p5.textSize(20)
                    p5.text(
                        'Select passive',
                        cumulativeMarginX + (optionWidth / 2),
                        cumulativeMarginY + (optionHeight / 2),
                    );
                }


                if (option.item) {
                    drawItem(option.item, cumulativeMarginX, cumulativeMarginY, canvas.itemSideSize, canvas.itemSideSize / 2, this.relativeOpacity, run, option, true);
                }
            }

        });

        if (this.animationStatus === AnimationStatus.IN_PROGRESS) {
            this.updateAnimation();
        }
    }

    calculateSpeed(): void {
        this.animationStatus = AnimationStatus.IN_PROGRESS;
        this.frames = 15;

        this.initialOpacity = 255;
        this.relativeOpacitySpeed = 255 / this.frames;
        this.relativeOpacity = -255;
    }

    updateAnimation(): void {
        if (this.frames) {
            this.relativeOpacity += this.relativeOpacitySpeed;

            this.frames--;
            if (this.frames === 0) {
                this.relativeOpacity = 0;
                this.relativeOpacitySpeed = 0;
                this.animationStatus = AnimationStatus.FINISHED;
            }
        }
    }
}

export class DialogOption implements IDialogOption {
    action: () => void;
    color: Color;
    disabled: boolean;
    limits: Limits;

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
                        if (item.frequency !== Frequency.PASSIVE) {
                            if (run.player.hasItem('Extra Active Item')) {
                                if (run.player.itemData.activeItem === undefined) {
                                    run.player.itemData.activeItem = item;
                                } else if (run.player.itemData.activeItem2 === undefined) {
                                    run.player.itemData.activeItem2 = item;
                                } else {
                                    const aux: Item = run.player.itemData.activeItem2;
                                    run.player.itemData.activeItem2 = item;
                                    run.player.itemData.activeItem = aux;
                                }
                            } else {
                                run.player.itemData.activeItem = item;
                            }
                        } else {
                            item.effect();
                            run.player.items.push(item);
                        }
                        if (callback) {
                            callback();
                        }
                    },
                    Item.rarityColors[item.rarity].color,
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

export class PassiveDialogOption extends DialogOption {
    item: Item

    constructor(action: () => void, color: Color, item?: Item) {
        super(action, color)
        this.item = item;
    }
}

export class NavigationDialogOption extends DialogOption {
    stage: Stage;
    index: number;

    constructor(action: () => void, color: Color, stage: Stage, index: number) {
        super(action, color)
        this.stage = stage;
        this.index = index;
    }
}
