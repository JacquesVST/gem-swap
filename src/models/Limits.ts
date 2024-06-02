import { ILimits } from "../interfaces";
import { Position } from "./Position";

export class Limits implements ILimits {
    min: Position;
    max: Position;

    constructor(min: Position, max: Position) {
        this.min = min;
        this.max = max;
    }

    contains(position: Position): boolean {
        return position.x > this.min.x && position.x < this.max.x && position.y > this.min.y && position.y < this.max.y;
    }

}