import { randomBetween } from "../utils/Functions";
import { Color } from "./Color";
import { BossEnemy, CommonEnemy, Enemy, MiniBossEnemy } from "./Enemy";
import { EventEmitter } from "./EventEmitter";
import { Floor } from "./Floor";
import { Grid } from "./Grid";

export interface StageActions {
    setupBranchedStage(enemyCount: number): void;
    setupGrid(x: number, y: number): void;
}

export class Stage extends EventEmitter {
    number: number;
    floor: Floor;
    grid: Grid;
    isLast: boolean;

    constructor(number: number, floor: Floor, isLast: boolean = false) {
        super('Stage');
        this.number = number;
        this.floor = floor;
        this.isLast = isLast;
    }
}

export class EnemyStage extends Stage implements StageActions {
    number: number;
    floor: Floor;
    currentEnemyIndex: number = 0;
    enemies: Enemy[] = [];
    color: Color;

    constructor(number: number, floor: Floor, isLast: boolean = false) {
        super(number, floor, isLast);
    }

    setupBranchedStage(enemyCount: number): void {
        this.enemies = [...Array(enemyCount)];
    }

    setupGrid(x: number, y: number): void {
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
        let miniBossCount = randomBetween(1, 3);
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

