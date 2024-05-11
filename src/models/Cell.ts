import { Position } from "./Position";
import { Item } from "./Item";
import { generateId } from "../utils/Functions";

export class Cell {
    position: Position;
    id: string;
    item: Item;
    canvasPosition: Position = new Position(0, 0);

    constructor(position: Position) {
        this.position = position;
        this.id = generateId();
    }
}
