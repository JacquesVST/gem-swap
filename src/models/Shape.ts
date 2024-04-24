import { Color } from "./Color";

export class Shape {
    sides: number;
    color: Color;
    bonusDmg: number;

    constructor(sides: number, color: Color) {
        this.sides = sides;
        this.color = color;
        this.bonusDmg = 0
    }
}
