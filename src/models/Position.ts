export class Position {
    x: number;
    y: number;
    checksum: string;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.checksum = 'X' + x + 'Y' + y;
    }

    difference(other: Position): Position {
        return new Position(other.x - this.x, other.y - this.y);
    }

    minus(other: Position): Position {
        return new Position(this.x - other.x, this.y - other.y);
    }

    average(other: Position): Position {
        return new Position((this.x + other.x) / 2, (this.y + other.y) / 2);
    }

    addX(x: number): Position{
        return new Position(this.x + x, this.y);
    }

    addY(y: number): Position{
        return new Position(this.x, this.y+ y);
    }
}
