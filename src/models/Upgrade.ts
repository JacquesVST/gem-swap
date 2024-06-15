import { IUpgrade, IUpgradeOption } from "../interfaces";
import { getDefaultUpgradeObject, getXP } from "../utils/LocalStorage";
import { Limits } from "./Limits";

export class Upgrade implements IUpgrade {
    totalPoints: number;
    xp: number;
    options: UpgradeOption[];
    nextPoint: number;

    constructor(upgrade: IUpgrade) {
        this.totalPoints = upgrade.totalPoints;
        this.xp = getXP();
        this.addOptionsFromInterface(upgrade.options);
        this.calculateTotalPoints();
    }

    get spentPoints(): number {
        let cumulativePoints: number = 0;
        this.options.forEach((option: UpgradeOption) => {
            cumulativePoints += option.points;
        });
        return cumulativePoints;
    }

    canAfford(option: UpgradeOption): boolean {
        return this.spentPoints < this.totalPoints && option.points < option.maxPoints
    }

    addOptionsFromInterface(optionsInterface: IUpgradeOption[]): void {
        const options: UpgradeOption[] = [];
        optionsInterface.forEach((option: IUpgradeOption) => {
            options.push({ ...option, limitsAdd: Limits.from(option.limitsAdd), limitsSub: Limits.from(option.limitsSub) })
        })

        getDefaultUpgradeObject().options.forEach((defaultOption: IUpgradeOption) => {
            options.find((option: UpgradeOption) => option.property === defaultOption.property).formatNumber = defaultOption.formatNumber;
            options.find((option: UpgradeOption) => option.property === defaultOption.property).formatValue = defaultOption.formatValue;
        })

        this.options = options;
    }

    calculateTotalPoints(): void {
        let points: number = 0;
        while (this.calculatePointCost(points) < this.xp) {
            points++;
        }
        this.totalPoints = points
        this.nextPoint = this.calculatePointCost(points + 1);
    }

    calculatePointCost(x: number): number {
        const a: number = 3;
        const b: number = 8;
        const c: number = 0.0888;
        return Math.floor((a * (Math.pow(b, (x - 1) * c) - 1)) + 1);
    }

}

export interface UpgradeOption extends IUpgradeOption {
    limitsAdd?: Limits;
    limitsSub?: Limits;
}
