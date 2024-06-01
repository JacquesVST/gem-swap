import { IEnemyStage, IStage } from "../interfaces";
import { Color } from "./Color";
import { BossEnemy, CommonEnemy, Enemy, MiniBossEnemy } from "./Enemy";
import { Floor } from "./Floor";
import { Grid } from "./Grid";

export class Stage implements IStage {
    number: number;
    floor: Floor;
    grid: Grid;
    isLast: boolean;
    color: Color;

    constructor(number: number, floor: Floor, isLast: boolean = false) {
        this.number = number;
        this.floor = floor;
        this.isLast = isLast;
    }

    initStage(x: number, y: number): void { }
}

export class ItemStage extends Stage {

    constructor(number: number, floor: Floor) {
        super(number, floor);
        this.color = Color.GREEN;
    }

    initStage(x: number, y: number): void {
        this.grid = new Grid(x, y, { ...this });
    }
}

export class ShopStage extends Stage {

    constructor(number: number, floor: Floor) {
        super(number, floor);
        this.color = Color.YELLOW;
    }

    initStage(x: number, y: number): void {
        this.grid = new Grid(x, y, { ...this });
    }
}

export class EnemyStage extends Stage implements IEnemyStage {
    number: number;
    floor: Floor;
    currentEnemyIndex: number = 0;
    enemies: Enemy[] = [];

    constructor(number: number, floor: Floor, isLast: boolean = false) {
        super(number, floor, isLast);
    }

    setupBranchedStage(enemyCount: number): void {
        this.enemies = [...Array(enemyCount)];
    }

    initStage(x: number, y: number): void {
        this.grid = new Grid(x, y, { ...this });
    }
}

export class CommonEnemyStage extends EnemyStage {
    constructor(number: number, floor: Floor, isLast: boolean = false) {
        super(number, floor, isLast);
        this.color = new Color(86, 101, 115);
    }

    setupBranchedStage(enemyCount: number): void {
        this.enemies = [...Array(enemyCount)].map(
            (enemy: Enemy, index: number) => {
                return new CommonEnemy(index + 1, { ...this }, index === enemyCount - 1);
            }
        );
    }
}

export class MiniBossStage extends EnemyStage {
    constructor(number: number, floor: Floor, isLast: boolean = false) {
        super(number, floor, isLast);
        this.color = new Color(235, 152, 78);
    }

    setupBranchedStage(enemyCount: number): void {
        let miniBossCount: number = Math.ceil(enemyCount / 3);
        this.enemies = [...Array(miniBossCount)].map(
            (enemy: Enemy, index: number) => {
                return new MiniBossEnemy(index + 1, { ...this }, index === miniBossCount - 1);
            }
        );
    }
}

export class BossStage extends EnemyStage {
    constructor(number: number, floor: Floor, isLast: boolean = false) {
        super(number, floor, isLast);
        this.color = new Color(87, 49, 214);
    }

    setupBranchedStage(enemyCount: number): void {
        let commonEnemyCount: number = Math.floor(enemyCount / 2);
        this.enemies = [...Array(commonEnemyCount)].map(
            (enemy: Enemy, index: number) => {
                return new CommonEnemy(index + 1, { ...this }, false);
            }
        );
        this.enemies.push(new BossEnemy(this.enemies.length + 1, { ...this }, true));
    }

}

