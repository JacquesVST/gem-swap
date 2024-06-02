import { Limits } from "./Limits";

export class Position {
    x: number;
    y: number;

    static ORIGIN: Position = Position.of(0, 0);

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    static of(x: number, y: number): Position {
        return new Position(x, y)
    }

    get checksum(): string {
        return 'X' + this.x + 'Y' + this.y;
    }

    difference(other: Position): Position {
        return Position.of(other.x - this.x, other.y - this.y);
    }

    divide(divisor: number): Position {
        return Position.of(this.x / divisor, this.y / divisor);
    }

    sum(other: Position): Position {
        return Position.of(this.x + other.x, this.y + other.y);
    }

    minus(other: Position): Position {
        return Position.of(this.x - other.x, this.y - other.y);
    }

    average(other: Position): Position {
        return Position.of((this.x + other.x) / 2, (this.y + other.y) / 2);
    }

    addX(x: number): Position {
        return Position.of(this.x + x, this.y);
    }

    addY(y: number): Position {
        return Position.of(this.x, this.y + y);
    }

    toLimits(dimension: Position): Limits {
        return new Limits(this, this.sum(dimension));
    }
}
