import { IFloor } from "../interfaces";
import { Map } from "./Map";
import { BossStage, CommonEnemyStage, ItemStage, MiniBossStage, ShopStage, Stage } from "./Stage";

export class Floor implements IFloor {
    number: number;
    map: Map;

    stages: Stage[][] = [];
    currentStageIndex: number = 0;
    currentStageBranch: number = 0;

    constructor(number: number, map: Map) {
        this.number = number;
        this.map = map;
    }

    setupStages(stageCount: number, enemyCount: number): void {
        let finalStageCount: number = stageCount + this.number - 1;
        let branchCount: number = 2 + Math.ceil(this.number / 2);

        let stageTree: Stage[][] = [];

        for (let i: number = 0; i < finalStageCount; i++) {
            if (i === finalStageCount - 1) {
                let finalStage: BossStage = new BossStage(i + 1, { ...this }, true);
                finalStage.setupBranchedStage(enemyCount + (this.number - 1));
                stageTree.push([finalStage]);
            } else if (i === 0) {
                let firstStage: CommonEnemyStage = new CommonEnemyStage(i + 1, { ...this });
                firstStage.setupBranchedStage(enemyCount + (this.number - 1));
                stageTree.push([firstStage]);
            } else {
                let stages: Stage[] = [];
                for (let j: number = 0; j < branchCount; j++) {
                    let stage: Stage
                    const chance: number = Math.random();

                    if (chance < 0.05) {
                        stage = new ShopStage(i + 1, { ...this });
                    } else if (chance < 0.15) {
                        stage = new ItemStage(i + 1, { ...this });
                    } else if (chance < 0.30) {
                        stage = new MiniBossStage(i + 1, { ...this });
                        (stage as MiniBossStage).setupBranchedStage(enemyCount + (this.number - 1));
                    } else {
                        stage = new CommonEnemyStage(i + 1, { ...this });
                        (stage as CommonEnemyStage).setupBranchedStage(enemyCount + (this.number - 1));
                    }

                    stages.push(stage);
                }
                stageTree.push(stages);
            }
        }

        this.stages = stageTree;
    }
}
