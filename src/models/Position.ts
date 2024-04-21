
export class Position {
    x: number;
    y: number;
    checksum: string;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.checksum = 'X' + x + 'Y' + y;
    }

    difference(position: Position) {
        return new Position(position.x - this.x, position.y - this.y);
    }

    minus(position: Position) {
        return new Position(this.x - position.x, this.y - position.y);
    }
}
