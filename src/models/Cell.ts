import { Piece } from "./Piece";
import { Position } from "./Position";

export class Cell {
    position: Position;
    piece: Piece;
    canvasPosition: Position = new Position(0, 0);

    constructor(position: Position) {
        this.position = position;
    }
}
