import { IPosition } from "./General";
import { ICanvas } from "./P5";
import { IPiece } from "./Piece";
import { IRun } from "./Run";

export interface IGrid {
    width: number;
    height: number;
    sideSize: number;
    cells: ICell[][];
    selectedCellPosition: IPosition;
    runSnapshot: IRun;

    isUnstable: boolean;
}

export interface ICell {
    piece: IPiece;
    gridPosition: IPosition;
    canvasPosition: IPosition;
}

export interface ISwapData {
    piece1: IPiece;
    piece2: IPiece;
    cell1: ICell;
    cell2: ICell;
}
