import * as P5 from "p5";
import { Color } from "./Color";
import { Position } from "./Position";

export class CanvasInfo {
    private static instance: CanvasInfo;
    p5: P5;
    margin: number;
    padding: number;
    radius: number;
    uiBarSize: number;
    topUiSize: number;
    bottomUiSize: number;
    canvasSize: Position;
    playfield: Position;
    totalGridHeight: number;
    cellSideSize: number;
    barCount: number;

    private constructor(p5: P5, margin: number, padding: number, radius: number, uiBarSize: number, topUiBarCount: number, bottomUiBarCount: number) {
        this.margin = margin;
        this.padding = padding;
        this.radius = radius;
        this.uiBarSize = uiBarSize;
        this.p5 = p5

        this.barCount = topUiBarCount + bottomUiBarCount;
        this.topUiSize = this.calculateTopUiSize(topUiBarCount);
        this.bottomUiSize = this.calculateBottomUiSize(bottomUiBarCount);
        this.calculateCanvasAndPlayfield();
    }

    static getInstance(p5?: P5, margin?: number, padding?: number, radius?: number, uiBarSize?: number, topUiBarCount?: number, bottomUiBarCount?: number): CanvasInfo {
        if (!CanvasInfo.instance) {
            CanvasInfo.instance = new CanvasInfo(p5, margin, padding, radius, uiBarSize, topUiBarCount, bottomUiBarCount);
        }
        return CanvasInfo.instance;
    }

    calculateCanvasAndPlayfield(): void {
        let screenWidth: number = document.body.clientWidth;
        let screenHeight: number = ((screenWidth / 4) * 3) + this.topUiSize + this.bottomUiSize;

        let maxHeight: number = window.innerHeight - 360;
        if (screenHeight > maxHeight) {
            screenHeight = maxHeight
        }

        this.canvasSize = new Position(screenWidth, screenHeight);
        this.playfield = new Position(this.canvasSize.x - 2 * this.margin, (this.canvasSize.y - 2 * this.margin));
        this.p5.createCanvas(this.canvasSize.x, this.canvasSize.y);
    }

    calculateTopUiSize(topUiBarCount: number): number {
        return ((topUiBarCount + 1) * this.margin) + (topUiBarCount * this.uiBarSize);
    }

    calculateBottomUiSize(bottomUiBarCount: number): number {
        return ((bottomUiBarCount + 1) * this.margin) + (bottomUiBarCount * this.uiBarSize);
    }

    draw(): void {
        this.p5.background(0);
        this.p5.noStroke();
        this.p5.fill(new Color(20, 20, 20).value);
        this.p5.rect(
            this.margin,
            this.margin,
            this.playfield.x,
            this.playfield.y,
            this.radius + this.padding
        );
    }
}
