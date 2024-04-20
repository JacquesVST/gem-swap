
export class Position {
    x: number;
    y: number;
    checksum: string;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.checksum = 'X' + x + 'Y' + y;
    }
}
