import { Difficulty, IFloor } from "../interfaces";
import { Map } from "./Map";
import { RunConfig } from "./RunConfig";
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

    setupStages(config: RunConfig): void {
        let finalStageCount: number = config.map.stages;
        let branchCount: number = config.map.stageOptions + Math.floor(this.number * config.map.stageOptionsIncreaseByFloor);

        let stageTree: Stage[][] = [];

        for (let i: number = 0; i < finalStageCount; i++) {
            if (i === finalStageCount - 1) {
                let finalStage: BossStage = new BossStage(i + 1, { ...this }, true);
                finalStage.setupBranchedStage(config.map.enemies + (this.number - 1), config);
                stageTree.push([finalStage]);
            } else if (i === 0) {
                let firstStage: CommonEnemyStage = new CommonEnemyStage(i + 1, { ...this });
                firstStage.setupBranchedStage(config);
                stageTree.push([firstStage]);
            } else {
                let stages: Stage[] = [];
                for (let j: number = 0; j < branchCount; j++) {
                    let stage: Stage
                    const chance: number = Math.random() * 100;
                    if (chance < config.map.shopStageChance) {
                        stage = new ShopStage(i + 1, { ...this });
                    } else if (chance < config.map.shopStageChance + config.map.itemStageChance) {
                        stage = new ItemStage(i + 1, { ...this });
                    } else if (chance < config.map.shopStageChance + config.map.itemStageChance + config.map.miniBossStageChance) {
                        stage = new MiniBossStage(i + 1, { ...this });
                        (stage as MiniBossStage).setupBranchedStage(config);
                    } else {
                        stage = new CommonEnemyStage(i + 1, { ...this });
                        (stage as CommonEnemyStage).setupBranchedStage(config);
                    }

                    stages.push(stage);
                }
                stageTree.push(stages);
            }
        }

        this.stages = stageTree;
    }
}
