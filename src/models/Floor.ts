import { Run } from "./Run";
import { Stage } from "./Stage";

export class Floor {
    number: number;
    run: Run;
    currentStageIndex: number;
    stages: Stage[];

    constructor(number: number, run: Run) {
        this.number = number;
        this.run = run;
        this.currentStageIndex = 0;

        this.stages = [...Array(this.run.stagesPerFloor)].map(
            (stage: Stage, index: number) => {
                return new Stage(index + 1, { ...this });
            }
        );
    }
}
