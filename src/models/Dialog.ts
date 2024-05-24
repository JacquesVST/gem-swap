import { checkPositionInLimit } from "../utils/Functions";
import { CanvasInfo } from "./CanvasInfo";
import { Color } from "./Color";
import { ConfigureListeners, EventEmitter } from "./EventEmitter";
import { Item } from "./Item";
import { AnimationStatus } from "./PieceAnimation";
import { Position } from "./Position";
import { Run } from "./Run";
import { BossStage, EnemyStage, MiniBossStage } from "./Stage";

export class Dialog extends EventEmitter {
    title: string;
    message: string;
    options: DialogOption[];
    color: Color;
    keep: boolean;
    skip: boolean;

    animationStatus: AnimationStatus = AnimationStatus.NOT_STARTED;
    frames: number = 0;
    velocityFade: number = 0;
    relativeFade: number = 0;

    constructor(title: string, message: string, options: DialogOption[], color: Color, keep?: boolean, skip?: boolean, closeCallback?: () => void) {
        super();
        this.title = title;
        this.message = message;
        this.options = options;
        this.color = color;
        this.keep = keep;
        this.skip = skip;

        this.setupAdditionalOptions(closeCallback);
    }

    setupAdditionalOptions(closeCallback: () => void): void {
        if (this.keep) {
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

        if (this.skip) {
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
        const p5 = canvas.p5;

        if (this.animationStatus === AnimationStatus.NOT_STARTED) {
            this.setupAnimation();
        }

        let dialogWidth: number = canvas.playfield.x / 2;
        let dialogHeigth: number = canvas.playfield.y - (canvas.margin * 2);
        let marginX: number = (canvas.canvasSize.x / 2) - (dialogWidth / 2)

        p5.noStroke();
        p5.fill([...new Color(40, 40, 40).value, 255 + this.relativeFade]);
        p5.rect(
            marginX,
            canvas.margin * 2,
            dialogWidth,
            dialogHeigth,
            canvas.radius * 2
        );

        p5.textAlign(p5.CENTER, p5.CENTER)

        p5.fill([...this.color.value, 255 + this.relativeFade]);
        p5.stroke(0, 0, 0, 255 + this.relativeFade);
        p5.strokeWeight(4);
        p5.textSize(24)
        p5.text(
            this.title,
            canvas.canvasSize.x / 2,
            canvas.margin * 5,
        );

        p5.fill(200, 200, 200, 255 + this.relativeFade);
        p5.textSize(16)
        p5.text(
            this.message,
            canvas.canvasSize.x / 2,
            canvas.margin * 7,
        );

        let addFiller: boolean = this.options.length < 3

        let optionWidth: number = dialogWidth - (canvas.margin * 2);
        let optionHeight: number = ((dialogHeigth * 0.85) - ((this.options.length + (addFiller ? 2 : 0) + 1) * canvas.margin)) / (this.options.length + (addFiller ? 2 : 0));

        this.options.forEach((option: DialogOption, index: number) => {

            let cumulativeMargin: number = ((addFiller ? index + 1 : index) * (optionHeight + canvas.margin)) + (dialogHeigth * 0.15) + canvas.margin;

            let limits: number[] = [
                marginX + canvas.margin,
                marginX + canvas.margin + optionWidth,
                cumulativeMargin,
                cumulativeMargin + optionHeight
            ];

            option.limits = limits;

            let isMouseOver: boolean = checkPositionInLimit(new Position(p5.mouseX, p5.mouseY), ...limits)

            let opacity: number = (isMouseOver ? 255 : 200) + this.relativeFade

            p5.noStroke();
            p5.fill(...(option.disabled ? new Color(86, 101, 115).value : option.color.value), opacity <= 0 ? 0 : opacity);
            p5.rect(
                marginX + canvas.margin,
                cumulativeMargin,
                optionWidth,
                optionHeight,
                canvas.radius * 2
            );

            if (option instanceof ItemDialogOption) {
                p5.textAlign(p5.LEFT, p5.CENTER)
                p5.fill([...option.color.value, 255 + this.relativeFade]);
                p5.stroke(0, 0, 0, 255 + this.relativeFade);
                p5.strokeWeight(4);
                p5.textSize(16)
                p5.text(
                    option.item.rarity,
                    (canvas.canvasSize.x / 2) - (optionWidth / 2) + canvas.padding,
                    cumulativeMargin + canvas.margin + (canvas.padding / 2),
                );

                if (option.item.price && run?.character) {
                    let canAfford: boolean = run?.character.gold >= option.item.price;

                    p5.textAlign(p5.RIGHT, p5.CENTER)
                    p5.fill([...(canAfford ? new Color(244, 208, 63) : new Color(231, 76, 60)).value, 255 + this.relativeFade]);
                    p5.stroke(0, 0, 0, 255 + this.relativeFade);
                    p5.strokeWeight(4);
                    p5.textSize(16)
                    p5.text(
                        `$ ${option.item.price}`,
                        (canvas.canvasSize.x / 2) + (optionWidth / 2) - canvas.padding,
                        cumulativeMargin + canvas.margin + (canvas.padding / 2),
                    );

                    option.disabled = !canAfford;
                }

                if (option.item.unique) {
                    p5.textAlign(p5.LEFT, p5.CENTER)
                    p5.fill([...new Color(243, 156, 18).value, 255 + this.relativeFade]);
                    p5.stroke(0, 0, 0, 255 + this.relativeFade);
                    p5.strokeWeight(4);
                    p5.textSize(16)
                    p5.text(
                        'Unique',
                        (canvas.canvasSize.x / 2) - (optionWidth / 2) + canvas.padding,
                        cumulativeMargin + (canvas.margin * 3) + (canvas.padding / 2),
                    );
                }

                p5.textAlign(p5.CENTER, p5.CENTER)

                p5.fill(255, 255, 255, 255 + this.relativeFade);
                p5.stroke(0, 0, 0, 255 + this.relativeFade);
                p5.strokeWeight(4);
                p5.textSize(20)
                p5.text(
                    option.item.name,
                    canvas.canvasSize.x / 2,
                    cumulativeMargin + (3 * canvas.margin),
                );

                p5.fill(200, 200, 200, 255 + this.relativeFade);
                p5.textSize(16)

                p5.text(
                    option.item.description,
                    canvas.canvasSize.x / 2,
                    cumulativeMargin + (5 * canvas.margin),
                );

                if (option.item.isActive) {
                    p5.text(
                        'Single Use',
                        canvas.canvasSize.x / 2,
                        cumulativeMargin + (7 * canvas.margin),
                    );
                }
            }

            if (option instanceof DefaultDialogOption) {
                p5.textAlign(p5.CENTER, p5.CENTER)

                let positonY: number = cumulativeMargin + (2 * canvas.margin)

                if (!option.subtext && !option.subsubtext) {
                    positonY = cumulativeMargin + optionHeight / 2
                }

                p5.fill(255, 255, 255, 255 + this.relativeFade);
                p5.stroke(0, 0, 0, 255 + this.relativeFade);
                p5.strokeWeight(4);
                p5.textSize(20)
                p5.text(
                    option.text,
                    canvas.canvasSize.x / 2,
                    positonY,
                );

                p5.fill(200, 200, 200, 255 + this.relativeFade);
                p5.textSize(16)
                p5.text(
                    option.subtext,
                    canvas.canvasSize.x / 2,
                    cumulativeMargin + (4 * canvas.margin),
                );

                p5.fill(200, 200, 200, 255 + this.relativeFade);
                p5.textSize(16)
                p5.text(
                    option.subsubtext,
                    canvas.canvasSize.x / 2,
                    cumulativeMargin + (6 * canvas.margin),
                );
            }

            if (option instanceof NavigationDialogOption) {
                p5.textAlign(p5.CENTER, p5.CENTER)

                let positonY: number = cumulativeMargin + (2 * canvas.margin)

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

                p5.fill(255 + this.relativeFade);
                p5.strokeWeight(4);
                p5.stroke(0, 0, 0, 255 + this.relativeFade);
                p5.textSize(20)
                p5.text(
                    text,
                    canvas.canvasSize.x / 2,
                    positonY,
                );

                p5.fill(200, 200, 200, 255 + this.relativeFade);
                p5.textSize(16)
                p5.text(
                    subtext,
                    canvas.canvasSize.x / 2,
                    cumulativeMargin + (4 * canvas.margin),
                );
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
                            run.character.activeItem = item;
                        } else {
                            item.effect();
                            run.character.items.push(item);
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
        super();
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
        this.on('EventEmitter:MouseClicked:Click', (position: Position, run?: Run) => {
            setTimeout(() => {

                if (!this.currentDialog) {
                    return;
                }

                let selected: boolean = false;

                this.currentDialog.options.forEach((option: DialogOption, index: number) => {
                    if (option?.limits && checkPositionInLimit(position, ...option.limits)) {

                        selected = true;
                        if (!option.disabled) {
                            option.action();
                            if (option instanceof ItemDialogOption && option?.item?.price) {
                                run?.textAnimationController.goldAnimation(option.item.price * -1);
                                option.item.price = Math.floor(option.item.price * 1.2);
                            }
                            this.emit('OptionSelected', option);
                        }
                    }
                })

                if (selected) {

                    if (this.currentDialog && !this.currentDialog.keep) {
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