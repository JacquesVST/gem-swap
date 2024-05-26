export class Color {
    r: number;
    g: number;
    b: number;
    checksum: string;

    static RED: Color = new Color(231, 76, 60);
    static GREEN: Color = new Color(46, 204, 113);
    static BLUE: Color = new Color(46, 134, 193);
    static YELLOW: Color = new Color(244, 208, 63);
    static ORANGE: Color = new Color(243, 156, 18);
    static PINK: Color = new Color(240, 98, 146);
    static PURPLE: Color = new Color(87, 49, 214);

    constructor(r: number, g: number, b: number) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.checksum = `R${r}G${g}B${b}`;
    }

    get value(): [number, number, number] {
        return [this.r, this.g, this.b];
    }
}
