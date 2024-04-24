export class Color {
    r: number;
    g: number;
    b: number;
    checksum: string;

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
