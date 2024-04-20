import { Floor } from "./Floor";
import { Enemy } from "./Enemy";


export class Stage {
    number: number;
    floor: Floor;
    currentEnemyIndex: number;
    enemies: Enemy[];

    constructor(number: number, floor: Floor) {
        this.number = number;
        this.floor = floor;
        this.currentEnemyIndex = 0;

        this.enemies = [...Array(this.floor.run.enemyPerStage)].map(
            (enemy: Enemy, index: number) => {

                let isBoss: boolean = index === this.floor.run.enemyPerStage - 1;

                return new Enemy(index + 1, isBoss, this.floor.number - 1, this.number - 1);
            }
        );
    }
}
