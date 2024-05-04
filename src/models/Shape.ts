import { Color } from "./Color";

export class Shape {
    id: string;
    sides: number;
    color: Color;
    bonusDmg: number;

    constructor(id: string, sides: number, color: Color) {
        this.id = id;
        this.sides = sides;
        this.color = color;
        this.bonusDmg = 0
    }

    static defaultShapes(): Shape[] {
        return [
            new Shape('red', 3, new Color(231, 76, 60)),
            new Shape('green', 4, new Color(46, 204, 113)),
            new Shape('blue', 5, new Color(46, 134, 193)),
            new Shape('yellow', 6, new Color(244, 208, 63)),
            new Shape('orange', 7, new Color(243, 156, 18)),
            new Shape('pink', 8, new Color(240, 98, 146)),
        ];
    }
}
