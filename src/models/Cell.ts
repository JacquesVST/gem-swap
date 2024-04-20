import { Position } from "./Position";
import { Item } from "./Item";
import { generateId } from "../utils/Functions";

export class Cell {
    position: Position;
    canvasPosition: Position;
    item: Item;
    id: string;
    constructor(position: Position) {
        this.position = position;
        this.canvasPosition = new Position(0, 0);
        this.item = undefined;
        this.id = generateId();
    }
}
