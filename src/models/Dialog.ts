import * as P5 from "p5";
import { Canvas } from "../controllers/Canvas";
import { AnimationStatus, DialogType, Difficulty, Frequency, IDialog, IDialogOption, IFlatRunConfig, IRunConfigDialogField } from "../interfaces";
import { drawClickableBox, drawItem, endShadow, fillFlat, fillStroke, icon, startShadow } from "../utils/Draw";
import { formatNumber, generateId, insertLineBreaks, writeCamel } from "../utils/General";
import { getRunConfig, getUpgrades, setRunConfig } from "../utils/LocalStorage";
import { Color } from "./Color";
import { Icon } from "./Icon";
import { Item } from "./Item";
import { Limits } from "./Limits";
import { Position } from "./Position";
import { Relic } from "./Relic";
import { Run } from "./Run";
import { RunConfig } from "./RunConfig";
import { BossStage, CommonEnemyStage, ItemStage, MiniBossStage, ShopStage, Stage } from "./Stage";
import { Upgrade, UpgradeOption } from "./Upgrade";

export class Dialog implements IDialog {
    id: string;
    title: string;
    message: string;
    options: DialogOption[];
    textColor: Color;
    type: DialogType;
    rerollButton: Limits;

    animationStatus: AnimationStatus = AnimationStatus.NOT_STARTED;
    frames: number = 0;

    initialOpacity?: number = 0;
    relativeOpacity?: number = 0;
    relativeOpacitySpeed?: number = 0;

    customRunOptions: RunConfigDialogField[] = [];
    upgrade: Upgrade;

    constructor(title: string, message: string, options: DialogOption[], type: DialogType, closeCallback?: (id?: string) => void, textColor?: Color, run?: Run) {
        this.title = title;
        this.message = message;
        this.options = options;
        this.textColor = textColor ?? new Color(255, 255, 255);
        this.type = type
        this.id = generateId();

        if (type === DialogType.CUSTOM_RUN) {
            this.customRunOptions = getRunConfig() as RunConfigDialogField[];
        }

        if (type === DialogType.UPGRADES || type === DialogType.INITIAL) {
            this.upgrade = new Upgrade(getUpgrades());
        }

        this.setupAdditionalOptions(closeCallback, run);
    }

    get hasAdditionalButton(): boolean {
        return this.type === DialogType.SHOP || this.type === DialogType.SKIPPABLE_ITEM || this.type === DialogType.INITIAL || this.type === DialogType.UPGRADES;
    }

    get optionsAsRunConfig(): RunConfig {
        setRunConfig(this.customRunOptions);

        let config: IFlatRunConfig = {};

        this.customRunOptions.forEach((option: RunConfigDialogField) => {
            config[option.property] = option.rounding(option.currentValue);
        });

        return new RunConfig(Difficulty.CUSTOM).withFlatConfig(config);
    }

    setupAdditionalOptions(closeCallback: (id?: string) => void, run?: Run): void {
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

        if (this.options[0] instanceof RelicDialogOption && run) {
            this.options.unshift(new RelicDialogOption(
                () => {
                    if (closeCallback) {
                        closeCallback(this.id);
                    }
                },
                Color.DISABLED,
                run.player.relic,
                'Your Relic'
            ));
        }
    }

    draw(run?: Run): void {
        const canvas: Canvas = Canvas.getInstance();

        if (this.animationStatus === AnimationStatus.NOT_STARTED) {
            this.calculateSpeed();
        }

        const dimension: Position = Position.of(0, 0);
        const margin: Position = Position.of(0, 0);
        const textMarginCount: number = 8;
        const lengthOffSet: number = 5;

        let optionsLength: number = this.hasAdditionalButton ? this.options.length - 1 : this.options.length;

        if (this.type === DialogType.INITIAL) {
            optionsLength--;
        }

        optionsLength = optionsLength < 3 ? 3 : optionsLength;

        dimension.x = (optionsLength > lengthOffSet ? lengthOffSet : optionsLength) * canvas.itemSideSize + (((optionsLength > lengthOffSet ? lengthOffSet : optionsLength) + 1) * canvas.margin);
        margin.x = (canvas.windowSize.x / 2) - (dimension.x / 2);

        dimension.y = (Math.ceil(optionsLength / lengthOffSet) * canvas.itemSideSize) + ((Math.ceil(optionsLength / lengthOffSet) + textMarginCount) * canvas.margin) + (this.hasAdditionalButton ? canvas.margin + (canvas.itemSideSize / 4) : 0);
        margin.y = (canvas.windowSize.y / 2) - (dimension.y / 2);

        if (this.type === DialogType.INITIAL) {
            dimension.y += canvas.itemSideSize / 4
            margin.y = (canvas.windowSize.y / 2) - (dimension.y / 2);
        }

        if (this.type === DialogType.CUSTOM_RUN || this.type === DialogType.UPGRADES) {
            dimension.x = canvas.windowSize.x - canvas.margin * 4;
            dimension.y = canvas.windowSize.y - canvas.margin * 4;
            margin.x = canvas.margin * 2;
            margin.y = canvas.margin * 2;
        }

        const textOffset: number = margin.y + (textMarginCount * canvas.margin / 2);
        this.drawDialogBackground(dimension, margin, textOffset);
        this.drawOptions(lengthOffSet, dimension, margin, run);
        if (this.type === DialogType.CUSTOM_RUN) {
            this.drawCustomForm();
        }

        if (this.type === DialogType.UPGRADES) {
            this.drawUpgradesForm();
        }
    }

    drawDialogBackground(dimension: Position, margin: Position, textOffset: number): void {
        const canvas: Canvas = Canvas.getInstance();
        const p5: P5 = canvas.p5;

        const opacity: number = this.initialOpacity + this.relativeOpacity;

        const drawingContext: CanvasRenderingContext2D = p5.drawingContext as CanvasRenderingContext2D;

        startShadow(drawingContext)

        fillFlat(Color.GRAY_2.alpha(opacity))
        p5.rect(
            margin.x,
            margin.y,
            dimension.x,
            dimension.y,
            canvas.radius * 4
        );

        endShadow(drawingContext)

        p5.textAlign(p5.CENTER, p5.CENTER);

        fillStroke(this.textColor, opacity)
        p5.textSize(canvas.uiData.fontTitle)
        p5.text(
            this.title,
            canvas.windowSize.x / 2,
            textOffset - canvas.margin
        );

        fillStroke(Color.WHITE_1, opacity);
        p5.textSize(canvas.uiData.fontSubText)
        p5.strokeWeight(canvas.stroke);
        p5.text(
            this.message,
            canvas.windowSize.x / 2,
            textOffset + canvas.margin
        );
    }

    drawOptions(lengthOffSet: number, dimension: Position, margin: Position, run?: Run): void {
        const canvas: Canvas = Canvas.getInstance();
        const p5: P5 = canvas.p5;
        const drawingContext: CanvasRenderingContext2D = p5.drawingContext as CanvasRenderingContext2D;

        if (run?.player?.itemData?.rerolls > 0 && ![DialogType.INITIAL, DialogType.NAVIGATION].includes(this.type)) {

            const button: number = canvas.itemSideSize * 0.9;

            const offsetX: number = margin.x + dimension.x - canvas.margin - button;
            const offsetY: number = margin.y + canvas.margin

            this.rerollButton = Position.of(offsetX, offsetY).toLimits(Position.of(canvas.itemSideSize / 2, canvas.itemSideSize / 4));

            const opacity: number = (this.rerollButton.contains(canvas.mousePosition) ? 255 : 200) + this.relativeOpacity

            startShadow(drawingContext);

            fillFlat(Color.PURPLE);
            p5.rect(
                offsetX,
                offsetY,
                button,
                canvas.itemSideSize / 4,
                canvas.radius * 2
            );

            endShadow(drawingContext);
            fillStroke(Color.WHITE, opacity)
            p5.textAlign(p5.LEFT, p5.CENTER)
            icon(Icon.DICE, Position.of(offsetX + canvas.margin, offsetY + canvas.itemSideSize / 8))

            p5.textAlign(p5.RIGHT, p5.CENTER)
            p5.textSize(canvas.uiData.fontSubText)
            p5.text(
                `Reroll (${run.player.itemData.rerolls})`,
                offsetX + button - canvas.margin,
                offsetY + canvas.itemSideSize / 8,
            );

        }

        this.options.forEach((option: DialogOption, index: number) => {

            let optionWidth: number = canvas.itemSideSize;
            let optionHeight: number = canvas.itemSideSize;

            if (option instanceof RelicDialogOption) {
                optionWidth = canvas.itemSideSize * 1.5 + canvas.margin / 2;
            }

            if (option instanceof NavigationDialogOption && !(option.stage instanceof CommonEnemyStage || option.stage instanceof BossStage) && option.blind) {
                option.color = Color.RED;
            }

            // option frame
            let cumulativeMarginX: number = margin.x + (index % lengthOffSet * (optionWidth + canvas.margin)) + canvas.margin;
            let cumulativeMarginY: number = margin.y + (Math.floor(index / lengthOffSet) * (canvas.itemSideSize + canvas.margin)) + (canvas.margin * 8);

            cumulativeMarginX = this.options.length === (this.hasAdditionalButton ? 2 : 1) ? canvas.windowSize.x / 2 - (canvas.itemSideSize / 2) : cumulativeMarginX;

            if (this.hasAdditionalButton) {
                if (index === this.options.length - 1) {
                    optionWidth = (canvas.itemSideSize * 2) + canvas.margin;
                    optionHeight = canvas.itemSideSize / 4;

                    cumulativeMarginX = canvas.windowSize.x / 2 - (optionWidth / 2);
                    cumulativeMarginY = margin.y + dimension.y - canvas.margin - optionHeight;
                }

                if (this.type === DialogType.INITIAL && index >= this.options.length - 2) {
                    const innerIndex: number = (this.options.length * 2) - 3 - index * 2;
                    const offset: number = innerIndex * ((canvas.itemSideSize / 2) + (canvas.margin / 2));

                    optionWidth = canvas.itemSideSize
                    optionHeight = canvas.itemSideSize / 2;

                    cumulativeMarginX = canvas.windowSize.x / 2 - (optionWidth / 2) - offset;
                    cumulativeMarginY = margin.y + dimension.y - canvas.margin - optionHeight;
                }
            }

            if (this.type === DialogType.CUSTOM_RUN) {
                optionWidth = canvas.itemSideSize * 1.5;
                optionHeight = canvas.itemSideSize / 4;

                cumulativeMarginX = canvas.windowSize.x / 2 - (optionWidth + canvas.margin) * (index - 1) - optionWidth / 2
                cumulativeMarginY = margin.y + dimension.y - canvas.margin - optionHeight;
            }

            option.limits = new Limits(Position.of(cumulativeMarginX, cumulativeMarginY), Position.of(cumulativeMarginX + optionWidth, cumulativeMarginY + optionHeight));

            const isMouseOver: boolean = option.limits.contains(canvas.mousePosition)

            const opacityHightlight: number = (isMouseOver ? 255 : 200) + this.relativeOpacity

            if (!(option instanceof ItemDialogOption) && !(option instanceof PassiveDialogOption) && !(option instanceof RelicDialogOption)) {

                startShadow(drawingContext);

                fillFlat((option.disabled ? Color.DISABLED : option.color).alpha(opacityHightlight <= 0 ? 0 : opacityHightlight));
                p5.rect(
                    cumulativeMarginX,
                    cumulativeMarginY,
                    optionWidth,
                    optionHeight,
                    canvas.radius * 2
                );
                endShadow(drawingContext);

            }

            const opacity: number = this.initialOpacity + this.relativeOpacity;

            // option content
            if (option instanceof DefaultDialogOption) {
                p5.textAlign(p5.CENTER, p5.CENTER)

                const textMargin: number = cumulativeMarginY + (optionHeight / 2);
                const mainOffset: number = (option.subsubtext || option.subtext ? -1 : 0) * canvas.margin;

                if (option.icon) {
                    fillStroke(Color.WHITE, opacity)
                    icon(option.icon, Position.of(cumulativeMarginX + (optionWidth / 2), textMargin + mainOffset - canvas.margin * 2));
                }

                fillStroke(Color.WHITE, opacity)
                p5.textSize(canvas.uiData.fontText)
                p5.text(
                    option.text,
                    cumulativeMarginX + (optionWidth / 2),
                    textMargin + mainOffset
                );

                if (option.text === 'Close') {
                    icon(Icon.CLOSE, Position.of(cumulativeMarginX + canvas.margin, textMargin + mainOffset));
                }

                if (option.text === 'Skip') {
                    icon(Icon.SKIP, Position.of(cumulativeMarginX + canvas.margin, textMargin + mainOffset));
                }

                if (option.text === 'Start') {
                    icon(Icon.PLAY, Position.of(cumulativeMarginX + canvas.margin, textMargin + mainOffset));
                }

                if (option.text === 'Reset') {
                    icon(Icon.RESET, Position.of(cumulativeMarginX + canvas.margin, textMargin + mainOffset));
                }

                if (option.subtext) {
                    let subOffset: number = canvas.margin / 2 + (option.subsubtext ? 0 : 1) * (canvas.margin * 0.5);

                    fillStroke(Color.WHITE_1, opacity)
                    p5.textSize(canvas.uiData.fontSubText)
                    p5.text(
                        insertLineBreaks(option.subtext, p5.map(optionWidth - canvas.margin, 0, p5.textWidth(option.subtext), 0, option.subtext.length)),
                        cumulativeMarginX + (optionWidth / 2),
                        textMargin + subOffset
                    );
                }

                if (option.subsubtext) {
                    fillStroke(Color.WHITE_1, opacity)
                    p5.textSize(canvas.uiData.fontSubText)
                    p5.text(
                        insertLineBreaks(option.subsubtext, p5.map(optionWidth - canvas.margin, 0, p5.textWidth(option.subsubtext), 0, option.subsubtext.length)),
                        cumulativeMarginX + (optionWidth / 2),
                        textMargin + (canvas.margin * 2)
                    );
                }

                if (option.text === 'Upgrades') {
                    fillStroke(Color.WHITE_1, opacity)
                    p5.textAlign(p5.CENTER, p5.BOTTOM)
                    p5.textSize(canvas.uiData.fontDetail)
                    p5.text(
                        `${this.upgrade.totalPoints - this.upgrade.spentPoints} Points Available`,
                        cumulativeMarginX + (optionWidth / 2),
                        cumulativeMarginY + optionHeight - canvas.padding
                    );
                }

            }

            if (option instanceof NavigationDialogOption) {
                p5.textAlign(p5.CENTER, p5.CENTER)

                if (!(option.stage instanceof CommonEnemyStage || option.stage instanceof BossStage)  && option.blind) {
                    fillStroke(Color.WHITE, opacity)
                    p5.textAlign(p5.CENTER, p5.CENTER)
                    p5.textSize(canvas.margin * 3)
                    icon(Icon.QUESTION, Position.of(cumulativeMarginX + (optionWidth / 2), cumulativeMarginY + (optionHeight / 2)));

                } else {
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

                    fillStroke(Color.WHITE, opacity)
                    p5.textSize(canvas.uiData.fontText)
                    icon(option.icon, Position.of(cumulativeMarginX + (optionWidth / 2), textMargin - canvas.margin * 3));

                    fillStroke(Color.WHITE, opacity)
                    p5.textSize(canvas.uiData.fontText)
                    p5.text(
                        text,
                        cumulativeMarginX + (optionWidth / 2),
                        textMargin - canvas.margin
                    );

                    if (subtext) {
                        fillStroke(Color.WHITE_1, opacity)
                        p5.textSize(canvas.uiData.fontSubText)
                        p5.text(
                            insertLineBreaks(subtext, p5.map(optionWidth - canvas.margin, 0, p5.textWidth(subtext), 0, subtext.length)),
                            cumulativeMarginX + (optionWidth / 2),
                            textMargin + canvas.margin
                        );
                    }
                }
            }

            if (option instanceof RelicDialogOption) {
                const boxColor = option.detail === 'Yout Relic' ? Color.DISABLED : Color.BLUE;

                drawClickableBox(Position.of(cumulativeMarginX, cumulativeMarginY), Position.of(optionWidth, canvas.itemSideSize), boxColor);

                p5.textAlign(p5.CENTER, p5.TOP)
                fillStroke(Color.WHITE, opacity)
                p5.textSize(canvas.uiData.fontDetail)
                p5.text(
                    option.detail,
                    cumulativeMarginX + (optionWidth / 2),
                    cumulativeMarginY + (canvas.padding),
                );

                if (option.relic) {
                    if (!option.blind) {
                        p5.textAlign(p5.LEFT, p5.CENTER)
                        fillStroke(Color.WHITE_1, opacity)
                        p5.textSize(canvas.uiData.fontSubText)
                        p5.text(
                            option.relic.stat1.label,
                            cumulativeMarginX + canvas.padding,
                            cumulativeMarginY + optionHeight / 2 - canvas.margin * 1.5
                        );

                        p5.text(
                            option.relic.stat2.label,
                            cumulativeMarginX + canvas.padding,
                            cumulativeMarginY + optionHeight / 2
                        );

                        p5.text(
                            option.relic.stat3.label,
                            cumulativeMarginX + canvas.padding,
                            cumulativeMarginY + optionHeight / 2 + canvas.margin * 1.5
                        );

                        p5.textAlign(p5.RIGHT, p5.CENTER)
                        fillStroke(Color.WHITE, opacity)
                        p5.textSize(canvas.uiData.fontSubText)
                        p5.text(
                            '+' + option.relic.stat1.bonus + (option.relic.stat1.isPercent ? '%' : ''),
                            cumulativeMarginX + optionWidth - canvas.padding,
                            cumulativeMarginY + optionHeight / 2 - canvas.margin * 1.5
                        );

                        p5.text(
                            '+' + option.relic.stat2.bonus + (option.relic.stat2.isPercent ? '%' : ''),
                            cumulativeMarginX + optionWidth - canvas.padding,
                            cumulativeMarginY + optionHeight / 2
                        );

                        p5.text(
                            '+' + option.relic.stat3.bonus + (option.relic.stat3.isPercent ? '%' : ''),
                            cumulativeMarginX + optionWidth - canvas.padding,
                            cumulativeMarginY + optionHeight / 2 + canvas.margin * 1.5
                        );

                        p5.textAlign(p5.CENTER, p5.BOTTOM)
                        fillStroke(Color.WHITE, opacity)
                        p5.textSize(canvas.uiData.fontDetail)
                        p5.text(
                            `Power: ${Math.floor(option.relic.power)}`,
                            cumulativeMarginX + (optionWidth / 2),
                            cumulativeMarginY + optionHeight - (canvas.padding),
                        );

                    } else {
                        fillStroke(Color.WHITE, opacity)
                        p5.textAlign(p5.CENTER, p5.CENTER)
                        p5.textSize(canvas.margin * 3)
                        icon(Icon.QUESTION, Position.of(cumulativeMarginX + (optionWidth / 2), cumulativeMarginY + (optionHeight / 2)));
                    }
                }
            }

            if (option instanceof ItemDialogOption) {
                drawItem(option.item, Position.of(cumulativeMarginX, cumulativeMarginY), Position.of(canvas.itemSideSize, canvas.itemSideSize), this.relativeOpacity, run, option);
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
                    fillStroke(Color.WHITE, opacity)
                    p5.textSize(canvas.uiData.fontText)
                    p5.text(
                        'Select passive',
                        cumulativeMarginX + (optionWidth / 2),
                        cumulativeMarginY + (optionHeight / 2),
                    );
                }

                if (option.item) {
                    drawItem(option.item, Position.of(cumulativeMarginX, cumulativeMarginY), Position.of(canvas.itemSideSize, canvas.itemSideSize / 2), this.relativeOpacity, run, option, true);
                }
            }

        });

        if (this.animationStatus === AnimationStatus.IN_PROGRESS) {
            this.updateAnimation();
        }
    }

    drawCustomForm(): void {
        const canvas: Canvas = Canvas.getInstance();
        const p5: P5 = canvas.p5;
        const drawingContext: CanvasRenderingContext2D = p5.drawingContext as CanvasRenderingContext2D;

        let marginX: number = canvas.margin * 3;
        let marginY: number = canvas.margin * 10;

        const width: number = canvas.windowSize.x / 2 - canvas.margin * 4

        const opacity: number = this.initialOpacity + this.relativeOpacity;

        const splitAt: number = this.customRunOptions.findIndex((option: RunConfigDialogField, index: number) => {
            return option.split && index >= Math.ceil(this.customRunOptions.length / 2);
        })

        let lastColor: Color = Color.WHITE_1.alpha(opacity);

        this.customRunOptions.forEach((option: RunConfigDialogField, index: number) => {

            if (index >= splitAt) {
                if (index === splitAt) {
                    marginY = canvas.margin * 10;
                }
                marginX = canvas.windowSize.x / 2 + canvas.margin
                index = index - splitAt
            }

            const height: number = canvas.uiData.uiBarSize
            let offsetY: number = index * (height + canvas.margin);

            if (option) {

                if (option.color) {
                    lastColor = option.color.alpha(opacity);
                }

                if (option.split) {
                    marginY += canvas.margin * 2

                    const offset: number = canvas.margin * 1.5
                    p5.stroke(lastColor.value)
                    p5.line(marginX, marginY + offsetY - offset, marginX + width / 2 - canvas.margin * 3, marginY + offsetY - offset);
                    p5.line(marginX + width, marginY + offsetY - offset, marginX + width / 2 + canvas.margin * 3, marginY + offsetY - offset);

                    fillStroke(lastColor, opacity)
                    p5.textAlign(p5.CENTER, p5.CENTER)
                    p5.textSize(canvas.uiData.fontText)
                    p5.text(
                        option.split,
                        marginX + (width) / 2,
                        marginY + offsetY - offset,
                    )

                }

                option.limits = Position.of(marginX, marginY + offsetY).toLimits(Position.of(width, height))

                fillFlat(Color.GRAY_3.alpha(opacity))
                p5.rect(
                    marginX,
                    marginY + offsetY,
                    width,
                    height,
                    canvas.radius * 2
                );

                fillFlat(lastColor)
                p5.rect(
                    marginX,
                    marginY + offsetY,
                    p5.map(option.currentValue, option.minValue, option.maxValue, 0, width),
                    height,
                    canvas.radius * 2, 0, 0, canvas.radius * 2
                );

                startShadow(drawingContext)
                p5.rect(
                    marginX + p5.map(option.currentValue, option.minValue, option.maxValue, 0, width),
                    marginY + offsetY - canvas.padding / 2,
                    canvas.padding,
                    height + canvas.padding,
                    canvas.radius
                );
                endShadow(drawingContext)


                let label = writeCamel(option.property)
                label = label.replace('Health Attack', 'Health and Attack');

                fillStroke(Color.WHITE, opacity)
                p5.textAlign(p5.LEFT, p5.CENTER)
                p5.textSize(canvas.uiData.fontSubText)
                p5.text(
                    label,
                    marginX + canvas.margin,
                    marginY + offsetY,
                )

                let value: string = option.formatNumber(option.rounding(option.currentValue));

                fillStroke(Color.WHITE, opacity)
                p5.textAlign(p5.RIGHT, p5.CENTER)
                p5.textSize(canvas.uiData.fontSubText)
                p5.text(
                    value,
                    marginX + width - canvas.margin,
                    marginY + offsetY,
                )
            }
        })

    }

    drawUpgradesForm(): void {
        const canvas: Canvas = Canvas.getInstance();
        const p5: P5 = canvas.p5;
        const drawingContext: CanvasRenderingContext2D = p5.drawingContext as CanvasRenderingContext2D;

        let marginY: number = canvas.margin * 10;

        const opacity: number = this.initialOpacity + this.relativeOpacity;
        const buttonSideSize: number = canvas.itemSideSize / 3;

        startShadow(drawingContext);
        fillFlat(Color.GRAY_3.alpha(opacity))
        p5.rect(
            canvas.windowSize.x / 4,
            marginY,
            canvas.windowSize.x / 2,
            buttonSideSize,
            canvas.radius * 2
        );

        this.upgrade.resetLimits = Position.of(canvas.windowSize.x / 4 + canvas.padding, marginY + canvas.padding).toLimits(Position.of(buttonSideSize - canvas.padding * 2, buttonSideSize - canvas.padding * 2));
        const hightlightReset: number = (this.upgrade.resetLimits.contains(canvas.mousePosition) ? this.initialOpacity : 200) + this.relativeOpacity

        fillFlat(Color.BLUE.alpha(hightlightReset))
        p5.rect(
            canvas.windowSize.x / 4 + canvas.padding,
            marginY + canvas.padding,
            buttonSideSize - canvas.padding * 2,
            buttonSideSize - canvas.padding * 2,
            canvas.radius * 2
        );
        endShadow(drawingContext);


        fillStroke(Color.WHITE, hightlightReset);
        icon(Icon.RESET,
            Position.of(
                canvas.windowSize.x / 4 + canvas.padding + (buttonSideSize - canvas.padding * 2) / 2,
                marginY + canvas.padding + (buttonSideSize - canvas.padding * 2) / 2
            )
        );

        fillStroke(Color.WHITE, opacity);
        p5.textAlign(p5.LEFT, p5.CENTER);
        p5.text(
            `Available: ${this.upgrade.totalPoints - this.upgrade.spentPoints}`,
            canvas.windowSize.x / 4 + buttonSideSize + canvas.padding * 2,
            marginY + buttonSideSize / 2
        );

        fillStroke(Color.WHITE, opacity);
        p5.textAlign(p5.RIGHT, p5.CENTER);
        p5.text(
            `Next at: ${formatNumber(this.upgrade.xp)}/${formatNumber(this.upgrade.nextPoint)} XP`,
            (canvas.windowSize.x / 4 * 3) - canvas.margin,
            marginY + buttonSideSize / 2
        );

        marginY = canvas.margin * 15

        this.upgrade.options.forEach((option: UpgradeOption, index: number) => {
            let marginXLeft: number = canvas.windowSize.x / 4;
            let marginXRight: number = canvas.windowSize.x / 4 * 3;
            const offsetY = (buttonSideSize * 1.25 + canvas.margin) * index;

            option.limitsSub = Position.of(marginXLeft, marginY + offsetY).toLimits(Position.of(buttonSideSize, buttonSideSize))

            const hightlightMinus: number = (option.limitsSub.contains(canvas.mousePosition) ? this.initialOpacity : 200) + this.relativeOpacity

            startShadow(drawingContext);
            p5.textAlign(p5.CENTER, p5.CENTER)
            fillFlat(Color.RED.alpha(hightlightMinus))
            p5.rect(
                marginXLeft,
                marginY + offsetY,
                buttonSideSize,
                buttonSideSize,
                canvas.radius * 2
            );
            endShadow(drawingContext);

            fillStroke(Color.WHITE, opacity);
            icon(Icon.MINUS, Position.of(marginXLeft + buttonSideSize / 2, marginY + offsetY + buttonSideSize / 2))

            const normalizedMaxPoints: number = option.maxPoints / option.cost;

            const dotSize = buttonSideSize / 2
            const gapSize = (canvas.windowSize.x - dotSize * 2 - ((marginXLeft + buttonSideSize) * 2) - (normalizedMaxPoints * dotSize)) / (normalizedMaxPoints + 1)
            const dotMarginX = marginXLeft + buttonSideSize + gapSize + dotSize / 2;

            startShadow(drawingContext);
            for (let i: number = 0; i < normalizedMaxPoints; i++) {
                let offsetX = (dotSize + gapSize) * i + dotSize;

                const color: Color = option.points / option.cost > i ? Color.WHITE : Color.GRAY_3;

                fillFlat(color.alpha(opacity))
                p5.ellipse(
                    dotMarginX + offsetX,
                    marginY + offsetY + dotSize,
                    dotSize
                );
            }

            option.limitsAdd = Position.of(marginXRight - buttonSideSize, marginY + offsetY).toLimits(Position.of(buttonSideSize, buttonSideSize))

            const hightlightPlus: number = (option.limitsAdd.contains(canvas.mousePosition) ? this.initialOpacity : 200) + this.relativeOpacity

            fillFlat(Color.GREEN.alpha(hightlightPlus))
            p5.rect(
                marginXRight - buttonSideSize,
                marginY + offsetY,
                buttonSideSize,
                buttonSideSize,
                canvas.radius * 2
            );
            endShadow(drawingContext);


            fillStroke(Color.WHITE, opacity);
            icon(Icon.PLUS, Position.of(marginXRight - buttonSideSize + buttonSideSize / 2, marginY + offsetY + buttonSideSize / 2));

            let property = writeCamel(option.property);

            if (property.startsWith('Relic')) {
                property = 'Relic Power'
            }

            fillStroke(Color.WHITE, opacity);
            p5.textSize(canvas.uiData.fontText);
            p5.textAlign(p5.RIGHT, p5.CENTER);
            p5.text(
                property,
                marginXLeft - canvas.margin,
                marginY + offsetY + buttonSideSize / 2
            );

            p5.textAlign(p5.LEFT, p5.CENTER);
            p5.text(
                option.formatNumber(option.points),
                marginXRight + canvas.margin,
                marginY + offsetY + buttonSideSize / 2
            );

        });

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
    action: (params?: any) => void;
    color: Color;
    disabled: boolean;
    limits: Limits;
    icon: Icon;

    constructor(action: (params?: any) => void, color: Color, icon?: Icon) {
        this.action = action;
        this.color = color;
        this.icon = icon;
    }
}

export class ItemDialogOption extends DialogOption {
    item: Item;

    constructor(action: () => void, color: Color, item: Item, icon?: Icon) {
        super(action, color, icon)
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

export class RelicDialogOption extends DialogOption {
    relic: Relic;
    detail: string;
    blind: boolean;

    constructor(action: () => void, color: Color, relic: Relic, detail?: string, blind: boolean = false, icon?: Icon) {
        super(action, color, icon)
        this.relic = relic;
        this.detail = detail;
        this.blind = blind;
    }

    static relicToDialogOption(relic: Relic, run: Run, callback?: () => void): RelicDialogOption {
        let isBlind: boolean = Math.random() < 0.10;
        return new RelicDialogOption(
            () => {
                if (relic.id !== run.player?.relic?.id) {
                    run.player.changeRelic(relic)
                }
                if (callback) {
                    callback();
                }
            },
            Color.BLUE,
            relic,
            'New Relic',
            isBlind
        )
    }
}

export class DefaultDialogOption extends DialogOption {
    text: string;
    subtext: string;
    subsubtext: string;

    constructor(action: (params?: any) => void, color: Color, text: string, subtext?: string, subsubtext?: string, icon?: Icon) {
        super(action, color, icon)
        this.text = text;
        this.subtext = subtext;
        this.subsubtext = subsubtext;
    }
}

export class PassiveDialogOption extends DialogOption {
    item: Item

    constructor(action: () => void, color: Color, item?: Item, icon?: Icon) {
        super(action, color, icon)
        this.item = item;
    }
}

export class NavigationDialogOption extends DialogOption {
    stage: Stage;
    index: number;
    blind: boolean;

    constructor(action: () => void, color: Color, stage: Stage, index: number, icon?: Icon, blind?: boolean) {
        super(action, color, icon)
        this.stage = stage;
        this.index = index;
        this.blind = blind
    }
}

export interface RunConfigDialogField extends IRunConfigDialogField {
    limits?: Limits;
}
