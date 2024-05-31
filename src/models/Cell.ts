import { ICell } from "../interfaces";
import { Piece } from "./Piece";
import { Position } from "./Position";

export class Cell implements ICell {
    piece: Piece;
    gridPosition: Position;
    canvasPosition: Position = Position.ORIGIN;

    constructor(position: Position) {
        this.gridPosition = position;
    }
}
