import * as P5 from "p5";
import { ICanvas, IGridData, IUiData } from "../interfaces";
import { Color } from "../models/Color";
import { Position } from "../models/Position";

export class Canvas implements ICanvas {
    private static instance: Canvas;
    p5: P5;
    margin: number;
    radius: number;
    padding: number;
    stroke: number;
    itemSideSize: number;
    windowSize: Position;
    playField: Position;
    uiData: IUiData;
    gridData: IGridData;

    private constructor(p5: P5) {
        this.p5 = p5

        this.calculateAndCreatePlayfield();
    }

    static getInstance(p5?: P5): Canvas {
        if (!Canvas.instance) {
            Canvas.instance = new Canvas(p5);
        }
        return Canvas.instance;
    }

    get mousePosition(): Position {
        return Position.of(this.p5.mouseX, this.p5.mouseY);
    }

    calculateAndCreatePlayfield(): void {
        const screenWidth: number = document.body.clientWidth;
        const screenHeight: number = window.innerHeight

        this.windowSize = Position.of(screenWidth, screenHeight);

        this.itemSideSize = this.scale(0.16);
        this.margin = this.scale(0.016);
        this.padding = this.scale(0.004);
        this.radius = this.scale(0.004);
        this.stroke = this.scale(0.002);

        const uiBarSize = this.scale(0.020);
        this.uiData = this.calculateUiSize({ uiBarSize, topBarCount: 3, bottomBarCount: 3 });

        this.playField = Position.of(this.windowSize.x - 2 * this.margin, (this.windowSize.y - 2 * this.margin));

        this.p5.createCanvas(this.windowSize.x, this.windowSize.y);
    }

    calculateUiSize(uiData: IUiData) {
        uiData.topUiSize = ((uiData.topBarCount + 1) * this.margin) + (uiData.topBarCount * uiData.uiBarSize);
        uiData.bottomUiSize = ((uiData.bottomBarCount + 1) * this.margin) + (uiData.bottomBarCount * uiData.uiBarSize);

        uiData.fontTitle = this.scale(0.024);
        uiData.fontText = this.scale(0.020);
        uiData.fontSubText = this.scale(0.016);
        uiData.fontDetail = this.scale(0.012);

        return uiData;
    }

    draw(): void {
        this.p5.background(0);
        this.p5.noStroke();
        this.p5.fill(Color.GRAY_1.value);
        this.p5.rect(
            this.margin,
            this.margin,
            this.playField.x,
            this.playField.y,
            this.radius + this.padding
        );
    }

    scale(factor: number): number {
        return this.p5.min(this.windowSize.x, this.windowSize.y) * factor;
    }

}