import { Map } from "./Map";
import { EnemyStage } from "./Stage";

export class Floor {
    number: number;
    map: Map;

    stages: EnemyStage[];
    currentStageIndex: number = 0;


    constructor(number: number, map: Map) {
        this.number = number;
        this.map = map;

        this.stages = this.setupStages();
    }

    setupStages(): EnemyStage[] {
        return [...Array(this.map.stageCount)].map(
            (_: EnemyStage, index: number) => {
                return new EnemyStage(index + 1, { ...this });
            }
        );
    }
}
