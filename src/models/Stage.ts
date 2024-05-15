import { BossEnemy, CommonEnemy, Enemy } from "./Enemy";
import { Floor } from "./Floor";


export class Stage {
    number: number;
    floor: Floor;
    constructor(number: number, floor: Floor) {
        this.number = number;
        this.floor = floor;
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


}

