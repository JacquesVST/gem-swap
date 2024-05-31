import { ILimits, IPosition } from "../interfaces";

export class Limits implements ILimits {
    min: IPosition;
    max: IPosition;

    constructor(min: IPosition, max: IPosition) {
        this.min = min;
        this.max = max;
    }

    contains(position: IPosition): boolean {
        return position.x > this.min.x && position.x < this.max.x && position.y > this.min.y && position.y < this.max.y;
    }

}