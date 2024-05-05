import * as P5 from "p5";
import { canReach, checkPositionInLimit, polygon } from "../utils/Functions";
import { CanvasInfo } from "./CanvasInfo";
import { Cell } from "./Cell";
import { Item } from "./Item";
import { Position } from "./Position";
import { Run } from "./Run";
export class Grid {
    width: number;
    height: number;
    sideSize: number;
    horizontalCenterPadding: number;
    verticalCenterPadding: number;
    selectedCellPos: Position;
    cells: Cell[][];

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.sideSize = 0;
        this.horizontalCenterPadding = 0;
        this.verticalCenterPadding = 0;

        this.selectedCellPos = undefined;

        this.generateEmptyCells();
    }

    generateEmptyCells(): void {
        this.cells = [...Array(this.width)].map(
            (_, x: number) => [...Array(this.height)].map(
                (_, y: number) => {
                    return new Cell(new Position(x, y));
                }
            )
        );
    }

    calculateSpacing(canvas: CanvasInfo): void {
        this.verticalCenterPadding = 0;
        this.verticalCenterPadding = 0;
        this.sideSize = 0;

        do {
            this.sideSize++;
            this.horizontalCenterPadding = canvas.playfield.x - (this.width * this.sideSize) - (this.width * canvas.padding) - canvas.padding;
            this.verticalCenterPadding = canvas.playfield.y - canvas.totalUiSize - (this.height * this.sideSize) - (this.height * canvas.padding) - canvas.padding;
        } while (this.horizontalCenterPadding - this.width >= 0 && this.verticalCenterPadding - this.height >= 0);

        this.iterateXtoY((x: number, y: number) => {

            let currentXMargin = (this.horizontalCenterPadding / 2) + (x * this.sideSize) + (x * canvas.padding) + canvas.padding + canvas.margin;
            let currentYMargin = canvas.totalUiSize + (this.verticalCenterPadding / 2) + (y * this.sideSize) + (y * canvas.padding) + canvas.padding + canvas.margin;

            this.cells[x][y].canvasPosition = new Position(currentXMargin, currentYMargin);
        });
    }

    isFull(): boolean {
        return [...this.cells.flat()].every(cell => cell.item);
    }

    generateItems(run: Run) {
        this.iterateYtoX((x: number, y: number) => {
            let cell: Cell = this.getCellbyPosition(new Position(x, y));
            if (!cell.item && cell.position.y === 0) {
                this.cells[x][y].item = Item.generateRandomItem(this.cells[x][y].position, this.sideSize, run.possibleShapes);
            }
        });
    }

    iterateXtoY(callback: (x: number, y: number) => void, breakX?: (x: number) => boolean, breakY?: (x: number, y: number) => boolean): void {
        for (let x = 0; x < this.width; x++) {
            if (breakX && breakX(x)) {
                break;
            }
            for (let y = 0; y < this.height; y++) {
                if (breakY && breakY(x, y)) {
                    break;
                }
                callback(x, y);
            }
        }
    }

    iterateYtoX(callback: (x: number, y: number) => void, breakY?: (y: number) => boolean, breakX?: (x: number, y: number) => boolean): void {
        for (let y = 0; y < this.height; y++) {
            if (breakY && breakY(y)) {
                break;
            }
            for (let x = 0; x < this.width; x++) {
                if (breakX && breakX(x, y)) {
                    break;
                }
                callback(x, y);
            }
        }
    }

    validateSwap(position1: Position, position2: Position, swapCompleteCallback: () => void, humanSwap: boolean = false, invalid: () => void, valid: () => void): () => void {

        if (position1.checksum === position2.checksum) {
            if (invalid && humanSwap) {
                invalid();
            }
            return undefined;
        }

        if (humanSwap && !canReach(position1, position2)) {
            if (invalid && humanSwap) {
                invalid();
            }
            return undefined;
        }

        let item1: Item | undefined = this.getItembyPosition(position1)?.renewPosition(position2);
        let item2: Item | undefined = this.getItembyPosition(position2)?.renewPosition(position1);

        if (humanSwap) {
            if (item1 && item2 && item1.shape.sides === item2.shape.sides) {
                if (invalid) {
                    invalid();
                }
                return undefined;
            }
        }


        if (valid && humanSwap) {
            valid();
        }

        return this.swap.bind(this, position1, position2, item1, item2, swapCompleteCallback);
    }

    getAnimateSwapData(position1: Position, position2: Position, humanSwap: boolean): AnimateSwapData {
        let cell1: Cell = this.getCellbyPosition(position1)
        let cell2: Cell = this.getCellbyPosition(position2)
        let item1: Item | undefined = this.getItembyPosition(position1);
        let item2: Item | undefined = this.getItembyPosition(position2);
        return { item1, item2, cell1, cell2, frames: humanSwap ? 10 : 3 }
    }

    swap(position1: Position, position2: Position, item1: Item, item2: Item, swapCompleteCallback: () => void): void {

        this.setCellItem(position1, item2);
        this.setCellItem(position2, item1);

        if (swapCompleteCallback) {
            swapCompleteCallback();
        }
    }

    draw(canvas: CanvasInfo, p5: P5, hasDialogOpen: boolean = false): void {
        this.cells.flat().forEach((cell: Cell) => {
            p5.noStroke();
            let limits: number[] = [
                cell.canvasPosition.x,
                cell.canvasPosition.x + this.sideSize,
                cell.canvasPosition.y,
                cell.canvasPosition.y + this.sideSize,
            ];

            let isSelectedCell: boolean = this.selectedCellPos ? cell.position.checksum === this.selectedCellPos.checksum : false;
            if ((!hasDialogOpen && checkPositionInLimit(new Position(p5.mouseX, p5.mouseY), ...limits)) || isSelectedCell) {
                p5.fill(175, 122, 197);
            } else {
                p5.fill(136, 78, 160);
            }

            p5.rect(
                cell.canvasPosition.x,
                cell.canvasPosition.y,
                this.sideSize,
                this.sideSize,
                canvas.radius
            );
        });
    }

    drawItems(p5: P5): void {
        this.cells.flat().map((cell: Cell) => cell.item).forEach((item: Item) => {
            if (item) {
                let cellRef: Cell = this.getCellbyPosition(item.position);
                p5.strokeWeight(2);
                p5.stroke(0, 0, 0, 255 - item.additiveFade);
                p5.fill(item.shape.color.r, item.shape.color.g, item.shape.color.b, 255 - item.additiveFade);
                polygon(
                    cellRef.canvasPosition.x + (this.sideSize / 2) + item.relativeEndPosition.x,
                    cellRef.canvasPosition.y + (this.sideSize / 2) + item.relativeEndPosition.y,
                    item.sideSize,
                    item.shape.sides,
                    p5
                );
                item.updatePosition();
            }
        });
    }

    getCellbyPosition(position: Position): Cell | undefined {
        return this.cells[position.x][position.y];
    }

    setCellItem(position: Position, item: Item | undefined): void {
        this.cells[position.x][position.y].item = item;
    }

    getItembyPosition(position: Position): Item | undefined {
        return this.cells[position.x][position.y].item;
    }

    getNeighbourCell(cell: Cell, xOffset: number = 0, yOffset: number = 0): Cell {
        let absoluteX: number = cell.position.x + xOffset;
        let absoluteY: number = cell.position.y + yOffset;

        if (absoluteX >= 0 && absoluteX < this.width && absoluteY >= 0 && absoluteY < this.height) {
            return this.cells[absoluteX][absoluteY];
        }

        return undefined;
    }

}


export interface AnimateSwapData {
    item1: Item;
    item2: Item;
    cell1: Cell;
    cell2: Cell;
    frames: number;
}