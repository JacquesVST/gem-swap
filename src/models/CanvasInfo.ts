import * as P5 from "p5";
import { Position } from "./Position";

export class CanvasInfo {
    margin: number;
    padding: number;
    radius: number;
    uiBarSize: number;
    totalUiSize: number;
    playfieldBackground: number;
    canvasSize: Position;
    playfield: Position;
    p5: P5

    constructor(p5: P5, margin: number, padding: number, radius: number, uiBarSize: number, uiBarCount: number) {
        this.margin = margin;
        this.padding = padding;
        this.radius = radius;
        this.uiBarSize = uiBarSize;
        this.p5 = p5
        this.totalUiSize = 0;

        this.playfieldBackground = 20;
        this.calculateTotalUiSize(uiBarCount);
        this.calculateCanvasAndPlayfield();
    }

    calculateCanvasAndPlayfield(): void {
        let screenWidth: number = document.body.clientWidth;
        let screenHeight: number = ((screenWidth / 16) * 9) + this.totalUiSize;

        let maxHeight: number = window.innerHeight - 360;
        if (screenHeight > maxHeight) {
            screenHeight = maxHeight
        }

        this.canvasSize = new Position(screenWidth, screenHeight);
        this.playfield = new Position(this.canvasSize.x - 2 * this.margin, (this.canvasSize.y - 2 * this.margin));
        this.p5.createCanvas(this.canvasSize.x, this.canvasSize.y);
    }

    calculateTotalUiSize(uiBarCount: number): void {
        this.totalUiSize = ((uiBarCount + 1) * this.margin) + (uiBarCount * this.uiBarSize);
    }

    drawPlayfield(): void {
        this.p5.background(0);
        this.p5.noStroke();
        this.p5.fill(this.playfieldBackground);
        this.p5.rect(
            this.margin,
            this.margin,
            this.playfield.x,
            this.playfield.y,
            this.radius + this.padding
        );
    }
}
