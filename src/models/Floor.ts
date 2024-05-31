import { IFloor } from "../interfaces";
import { Map } from "./Map";
import { BossStage, CommonEnemyStage, EnemyStage, MiniBossStage } from "./Stage";

export class Floor implements IFloor {
    number: number;
    map: Map;

    stages: EnemyStage[][] = [];
    currentStageIndex: number = 0;
    currentStageBranch: number = 0;

    constructor(number: number, map: Map) {
        this.number = number;
        this.map = map;
    }

    setupStages(stageCount: number, enemyCount: number): void {
        let finalStageCount: number = stageCount + this.number - 1;
        let branchCount: number = 2 + Math.ceil(this.number / 2);

        let stageTree: EnemyStage[][] = [];

        for (let i: number = 0; i < finalStageCount; i++) {
            if (i === finalStageCount - 1) {
                let finalStage: BossStage = new BossStage(i + 1, { ...this }, true);
                finalStage.setupBranchedStage(enemyCount);
                stageTree.push([finalStage]);
            } else if (i === 0) {
                let firstStage: CommonEnemyStage = new CommonEnemyStage(i + 1, { ...this });
                firstStage.setupBranchedStage(enemyCount);
                stageTree.push([firstStage]);
            } else {
                let stages: EnemyStage[] = [];
                for (let j: number = 0; j < branchCount; j++) {
                    let isMiniBoss: boolean = Math.random() < 0.20;
                    let stage: MiniBossStage | CommonEnemyStage = isMiniBoss ? new MiniBossStage(i + 1, { ...this }) : new CommonEnemyStage(i + 1, { ...this });
                    stage.setupBranchedStage(enemyCount);
                    stages.push(stage);
                }
                stageTree.push(stages);
            }
        }

        this.stages = stageTree;
    }
}
