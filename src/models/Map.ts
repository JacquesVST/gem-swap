import { BossEnemy, Enemy } from "./Enemy";
import { Floor } from "./Floor";
import { Run } from "./Run";
import { EnemyStage } from "./Stage";

export class Map {
    floorCount: number;
    stageCount: number;
    enemyCount: number;
    scale: number;
    run: Run;

    winState: boolean;
    floors: Floor[];
    branchingFloors: Floor[]
    currentFloorIndex: number;

    constructor(floorCount: number, stageCount: number, enemyCount: number, scale: number, run: Run) {
        this.floorCount = floorCount;
        this.stageCount = stageCount;
        this.enemyCount = enemyCount;
        this.scale = scale
        this.run = run

        this.currentFloorIndex = 0;
        this.floors = this.setupFloors();
        this.branchingFloors = this.setupBranchingFloors();
        this.winState = false
    }

    get totalEnemies(): number {
        return this.floorCount * this.stageCount * this.enemyCount;
    }

    setupBranchingFloors(): Floor[] {
        return [...Array(this.floorCount)].map(
            (_: Floor, index: number) => {
                let floor: Floor = new Floor(index + 1, { ...this });
                floor.setupBranches(this.stageCount, this.enemyCount);
                return floor
            }
        );
    }

    setupFloors(): Floor[] {
        return [...Array(this.floorCount)].map(
            (_: Floor, index: number) => {
                return new Floor(index + 1, { ...this });
            }
        );
    }

    nextEnemy(run: Run, enemyCallback?: () => void, stageCallback?: () => void, floorCallback?: () => void): void {
        let enemy: Enemy = run.findEnemy();
        if (enemy && enemy instanceof BossEnemy) {
            this.nextStage(run, stageCallback, floorCallback)
        } else {
            run.findStage().currentEnemyIndex++;
        }
        if (enemyCallback) {
            enemyCallback();
        }
    }

    nextStage(run: Run, stageCallback: () => void, floorCallback: () => void): void {
        let stage: EnemyStage = run.findStage();
        if (stage && stage.number === this.stageCount) {
            this.nextFloor(run, floorCallback)
        } else {
            run.findFloor().currentStageIndex++;
        }
        if (stageCallback) {
            stageCallback();
        }

    }

    nextFloor(run: Run, floorCallback: () => void): void {
        let floor: Floor = run.findFloor();
        if (floor && floor.number === this.floorCount) {
            this.winState = true
            run.win()
        } else {
            this.currentFloorIndex++;
        }
        if (floorCallback) {
            floorCallback();
        }

    }

}