import * as P5 from "p5";
import { Color } from "../models/Color";
import { Position } from "../models/Position";
import { ICanvas, IGridData, IPosition, IUiData } from "../interfaces";

export class Canvas implements ICanvas {
    private static instance: Canvas;
    p5: P5;
    margin: number;
    radius: number;
    padding: number;
    itemSideSize: number;
    windowSize: Position;
    playfield: Position;
    horizontalLayout: boolean;
    uiData: IUiData;
    gridData: IGridData;

    private constructor(p5: P5, margin: number, padding: number, radius: number, uiBarSize: number, topBarCount: number, bottomBarCount: number) {
        this.p5 = p5
        this.margin = margin;
        this.padding = padding;
        this.radius = radius;

        this.uiData = this.calculateUiSize({ uiBarSize, topBarCount, bottomBarCount });
        this.calculateAndCreatePlayfield();
    }

    static getInstance(p5?: P5, margin?: number, padding?: number, radius?: number, uiBarSize?: number, topUiBarCount?: number, bottomUiBarCount?: number): Canvas {
        if (!Canvas.instance) {
            Canvas.instance = new Canvas(p5, margin, padding, radius, uiBarSize, topUiBarCount, bottomUiBarCount);
        }
        return Canvas.instance;
    }

    get mousePosition(): IPosition {
        return new Position(this.p5.mouseX, this.p5.mouseY);
    }

    calculateAndCreatePlayfield(): void {
        const screenWidth: number = document.body.clientWidth;
        const screenHeight: number = window.innerHeight

        this.horizontalLayout = screenWidth > screenHeight
        this.windowSize = new Position(screenWidth, screenHeight);
        this.playfield = new Position(this.windowSize.x - 2 * this.margin, (this.windowSize.y - 2 * this.margin));
        this.itemSideSize = (this.playfield.x - (this.margin * 6)) / 7;
        this.p5.createCanvas(this.windowSize.x, this.windowSize.y);
    }

    calculateUiSize(uiData: IUiData) {
        uiData.topUiSize = ((uiData.topBarCount + 1) * this.margin) + (uiData.topBarCount * uiData.uiBarSize);
        uiData.bottomUiSize = ((uiData.bottomBarCount + 1) * this.margin) + (uiData.bottomBarCount * uiData.uiBarSize);
        return uiData;
    }

    draw(): void {
        this.p5.background(0);
        this.p5.noStroke();
        this.p5.fill(Color.GRAY_1.value);
        this.p5.rect(
            this.margin,
            this.margin,
            this.playfield.x,
            this.playfield.y,
            this.radius + this.padding
        );
    }

}