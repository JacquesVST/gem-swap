import { IUpgrade, IUpgradeOption } from "../interfaces";
import { getDefaultUpgradeObject, getXP } from "../utils/LocalStorage";
import { Limits } from "./Limits";

export class Upgrade implements IUpgrade {
    totalPoints: number;
    xp: number;
    options: UpgradeOption[];
    nextPoint: number;
    resetLimits?: Limits;

    constructor(upgrade: IUpgrade) {
        this.totalPoints = upgrade.totalPoints;
        this.xp = getXP();
        this.calculateTotalPoints();
        this.addOptionsFromInterface(upgrade.options);
    }

    get spentPoints(): number {
        let cumulativePoints: number = 0;
        this.options.forEach((option: UpgradeOption) => {
            cumulativePoints += option.points;
        });
        return cumulativePoints;
    }

    canAfford(option: UpgradeOption): boolean {
        return this.spentPoints < this.totalPoints && option.points < option.maxPoints && this.totalPoints - this.spentPoints >= option.cost
    }

    addOptionsFromInterface(optionsInterface: IUpgradeOption[]): void {
        const options: UpgradeOption[] = [];
        optionsInterface.forEach((option: IUpgradeOption) => {
            options.push({ ...option, limitsAdd: Limits.from(option.limitsAdd), limitsSub: Limits.from(option.limitsSub) })
        })

        getDefaultUpgradeObject().options.forEach((defaultOption: IUpgradeOption) => {
            const currentOptions: UpgradeOption = options.find((option: UpgradeOption) => option.property === defaultOption.property);
            if (currentOptions) {
                currentOptions.formatNumber = defaultOption.formatNumber;
                currentOptions.formatValue = defaultOption.formatValue;
                currentOptions.maxPoints = defaultOption.maxPoints;

                if (currentOptions.points > currentOptions.maxPoints) {
                    currentOptions.points = currentOptions.maxPoints
                }
            }
        })

        this.options = options;

        if (this.spentPoints > this.totalPoints) {
            this.reset();
        }
    }

    reset(): void {
        this.options.forEach((option: UpgradeOption) => option.points = 0);
    }

    calculateTotalPoints(): void {
        let points: number = 0;
        while (this.calculatePointCost(points + 1) <= this.xp) {
            points++;
        }
        this.totalPoints = points
        this.nextPoint = this.calculatePointCost(points + 1);
    }

    calculatePointCost(x: number): number {
        const a: number = 60;
        const b: number = 22;
        const c: number = 0.03;
        return Math.floor(a * (Math.pow(b, x * c) - 1));
    }

}

export interface UpgradeOption extends IUpgradeOption {
    limitsAdd?: Limits;
    limitsSub?: Limits;
}
