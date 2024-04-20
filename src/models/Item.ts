import { generateId } from "../utils/Functions";
import { Color } from "./Color";
import { Position } from "./Position";
import { Shape } from "./Shape";

export class Item {
    shape: Shape;
    position: Position;
    sideSize: number;
    id: string;

    constructor(shape: Shape, position: Position, sideSize: number) {
        this.shape = shape;
        this.position = position;
        this.sideSize = sideSize;
        this.id = generateId();
    }

    renewPosition(position: Position): Item {
        this.position = position;
        return this;
    }

    static generateRandomItem(position: Position, gridSideSize: number, possibleShapes: Color[]): Item {
        let randomShape = Math.floor(Math.random() * possibleShapes.length);
        let shape = new Shape(randomShape + 3, possibleShapes[randomShape]);
        return new Item(shape, position, gridSideSize / 3);
    }
}
