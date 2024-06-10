import { IShape, IShapeItemData } from "../interfaces";
import { Color } from "./Color";

export class Shape implements IShape {
    id: string;
    sides: number;
    color: Color;
    itemData: IShapeItemData = {
        bonusDamage: 0
    };

    constructor(id: string, sides: number, color: Color) {
        this.id = id;
        this.sides = sides;
        this.color = color;
    }

    static defaultShapes(): Shape[] {
        return [
            new Shape('red', 3, Color.RED),
            new Shape('green', 4, Color.GREEN),
            new Shape('blue', 5, Color.BLUE),
            new Shape('yellow', 6, Color.YELLOW),
            new Shape('pink', 7, Color.ORANGE),
            new Shape('orange', 8, Color.PINK)
        ];
    }

    static extraShape(): Shape {
        return new Shape('cyan', 9, Color.CYAN);
    }
}