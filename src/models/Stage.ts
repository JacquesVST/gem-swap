import { BossEnemy, CommonEnemy, Enemy } from "./Enemy";
import { Floor } from "./Floor";

export interface StageActions {
    setupBranchedStage(enemyCount: number, isFirst: boolean, isLast: boolean): void;
}

export class Stage implements StageActions {
    number: number;
    floor: Floor;
    constructor(number: number, floor: Floor) {
        this.number = number;
        this.floor = floor;
    }

    setupBranchedStage(enemyCount: number, isFirst: boolean, isLast: boolean): void {
        throw new Error("Method not implemented.");
    }
}

export class EnemyStage extends Stage {
    number: number;
    floor: Floor;
    currentEnemyIndex: number;
    enemies: Enemy[];

    constructor(number: number, floor: Floor) {
        super(number, floor)
        this.currentEnemyIndex = 0;

        this.enemies = [...Array(this.floor.map.enemyCount)].map(
            (enemy: Enemy, index: number) => {

                let isBoss: boolean = index === this.floor.map.enemyCount - 1;

                return isBoss ? new BossEnemy(index + 1, { ...this }) : new CommonEnemy(index + 1, { ...this });
            }
        );
    }

    setupBranchedStage(enemyCount: number, isFirst: boolean, isLast: boolean): void {
        throw new Error("Method not implemented.");
    }

}

export class MiniBossStage extends Stage {
    number: number;
    floor: Floor;
    currentEnemyIndex: number;
    enemies: Enemy[];

    constructor(number: number, floor: Floor) {
        super(number, floor)
        this.currentEnemyIndex = 0;

    }

    setupBranchedStage(enemyCount: number, isFirst: boolean, isLast: boolean): void {
        throw new Error("Method not implemented.");
    }

}

export class BossStage extends Stage {
    number: number;
    floor: Floor;
    currentEnemyIndex: number;
    enemies: Enemy[];

    constructor(number: number, floor: Floor) {
        super(number, floor)
        this.currentEnemyIndex = 0;

    }

    setupBranchedStage(enemyCount: number, isFirst: boolean, isLast: boolean): void {
        throw new Error("Method not implemented.");
    }

}

