import { IEnemy } from "./Enemy";
import { IColor } from "./General";
import { IGrid } from "./Grid";
import { IRun } from "./Run";

export interface IMap{
    /*
    floorCount: number;
    stageCount: number;
    enemyCount: number;
    */
    gridWidth: number;
    gridHeight: number;
    run: IRun;

    winState: boolean;
    floors: IFloor[];
    currentFloorIndex: number;
}

export interface IFloor {
    number: number;
    map: IMap;
    stages: IStage[][];
    currentStageIndex: number;
    currentStageBranch: number;
}

export interface IStage {
    number: number;
    floor: IFloor;
    grid: IGrid;
    isLast: boolean;
    color: IColor;
}

export interface IEnemyStage extends IStage {
    currentEnemyIndex: number;
    enemies: IEnemy[];
}