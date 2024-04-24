import { AnimatableObject } from "./AnimatableObject";
import { generateId } from "../utils/Functions";
import { Color } from "./Color";
import { Position } from "./Position";
import { Shape } from "./Shape";

export class Item extends AnimatableObject {
    shape: Shape;
    position: Position;
    sideSize: number;
    id: string;

    constructor(shape: Shape, position: Position, sideSize: number) {
        super()
        this.shape = shape;
        this.position = position;
        this.sideSize = sideSize;
        this.id = generateId();
    }

    renewPosition(position: Position): Item {
        this.position = position;
        return this;
    }

    static generateRandomItem(position: Position, gridSideSize: number, possibleShapes: Shape[]): Item {
        let randomShape = Math.floor(Math.random() * possibleShapes.length);
        let shape = possibleShapes[randomShape];
        return new Item(shape, position, gridSideSize / 3);
    }
}
