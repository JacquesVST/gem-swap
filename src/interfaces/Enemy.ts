import { IColor } from "./General";
import { IEnemyStage } from "./Map";

export interface IEnemy {
    maxHealth: number
    health: number;
    attack: number;
    gold: number;
    name: string;

    number: number;
    hasDrop: boolean;
    isLast: boolean;
    stage: IEnemyStage;
    color: IColor;
}