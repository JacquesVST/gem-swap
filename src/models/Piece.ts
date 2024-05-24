import { Effect } from "./Effect";
import { PieceAnimation } from "./PieceAnimation";
import { Position } from "./Position";
import { Run } from "./Run";
import { Shape } from "./Shape";

export class Piece extends PieceAnimation {
    shape: Shape;
    position: Position;
    sideSize: number;
    id: string;
    effect: Effect;
    critical: boolean = false;

    constructor(shape: Shape, position: Position, sideSize: number) {
        super()
        this.shape = shape;
        this.position = position;
        this.sideSize = sideSize;
    }

    renewPosition(position: Position): Piece {
        this.position = position;
        return this;
    }

    static generateRandomPiece(position: Position, gridSideSize: number, run: Run): Piece {
        let randomShape = Math.floor(Math.random() * run.possibleShapes.length);
        let shape = run.possibleShapes[randomShape];
        let piece: Piece = new Piece(shape, position, gridSideSize / 3);

        run.possibleEffects.forEach((effect: Effect) => {
            let chance: number = Math.random();
            if (chance <= effect.chance) {
                piece.effect = effect;
            }
        })

        return piece;
    }
}
