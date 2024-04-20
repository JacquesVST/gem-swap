import { Color } from "./Color";

export class Shape {
    sides: number;
    color: Color;

    constructor(sides: number, color: Color) {
        this.sides = sides;
        this.color = color;
    }
}
