import { IColor } from "../interfaces";

export class Color implements IColor {
    r: number;
    g: number;
    b: number;
    a: number;
    checksum: string

    static RED: Color = new Color(231, 76, 60);
    static GREEN: Color = new Color(46, 204, 113);
    static BLUE: Color = new Color(46, 134, 193);
    static YELLOW: Color = new Color(244, 208, 63);
    static ORANGE: Color = new Color(243, 156, 18);
    static PINK: Color = new Color(240, 98, 146);
    static PURPLE: Color = new Color(87, 49, 214);

    static WHITE: Color = new Color(255, 255, 255);
    static WHITE_1: Color = new Color(200, 200, 200);
    static BLACK: Color = new Color(0, 0, 0);
    static GRAY_1: Color = new Color(20, 20, 20);
    static GRAY_2: Color = new Color(40, 40, 40);
    static GRAY_3: Color = new Color(60, 60, 60);
    static GRAY_4: Color = new Color(80, 80, 80);

    static DISABLED: Color = new Color(86, 101, 115);
    static DIM: Color = new Color(50, 50, 50, 100);

    constructor(r: number, g: number, b: number, a: number = 255) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
        this.checksum = `R${r}G${g}B${b}A${a}`;
    }

    get value(): [number, number, number, number] {
        return [this.r, this.g, this.b, this.a];
    }

    alpha(a: number): Color {
        return new Color(this.r, this.g, this.b, a);
    }
}
