import { Map } from "./Map";
import { EnemyStage, Stage } from "./Stage";

export class Floor {
    number: number;
    map: Map;

    stages: EnemyStage[];
    currentStageIndex: number = 0;

    branchingStageLayer: number = 0;
    branchingStageChoice: number = 0;
    branchingStages: Stage[][] = []

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

    setupBranches(stageCount: number, enemyCount: number): void {
        let finalStageCount: number = stageCount + this.number - 1;
        let branchCount: number = 2 + Math.ceil(this.number / 2);

        let stageTree: Stage[][] = [];

        for (let i: number = 0; i < finalStageCount; i++) {
            if (i === 0) {
                let firstStage: Stage = new EnemyStage(i + 1, { ...this });
                //firstStage.setupBranchedStage(enemyCount, true, false);
                stageTree.push([firstStage]);
            } else if (i === finalStageCount - 1) {
                let finalStage: Stage = new EnemyStage(i + 1, { ...this });
                //finalStage.setupBranchedStage(enemyCount, false, true);
                stageTree.push([finalStage]);
            } else {
                let stages: Stage[] = [];
                for (let j: number = 0; j < branchCount; j++) {
                    let stage: Stage = new EnemyStage(i + 1, { ...this });
                    //stage.setupBranchedStage(enemyCount, false, false);
                    stages.push(stage);
                }
                stageTree.push(stages)
            }
        }

        this.branchingStages = stageTree;
    }
}
