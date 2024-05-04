import { Run } from "./Run";

export class Enemy {
    number: number;
    isBoss: boolean;
    name: string;
    health: number;
    currentHealth: number;
    attack: number;
    gold: number;

    constructor(number: number, isBoss: boolean, currentFloorIndex: number, currentStageIndex: number) {
        this.number = number;
        this.isBoss = isBoss;

        this.name = isBoss ? 'Boss' : 'Enemy';

        this.health = 0;
        this.currentHealth = 0;
        this.attack = 0;

        this.calculateStats(currentFloorIndex, currentStageIndex);
    }

    calculateStats(currentFloorIndex: number, currentStageIndex: number): void {
        let bossMultiplier: number = 1;

        if (this.isBoss) {
            bossMultiplier = 2 * (currentFloorIndex + 1);
            this.gold = Math.floor(Math.random() * (25 - 11) + 10);
        } else {
            this.gold = Math.floor(Math.random() * (5 - 1));
        }

        let maxHealth: number = 1500 * bossMultiplier * (1 + (currentFloorIndex / 2));
        let minHealth: number = 500 * bossMultiplier * (1 + (currentFloorIndex / 2));

        let enemyBaseAttack: number = 10 * (this.isBoss ? 1 + (bossMultiplier / 3) : 1);
        let enemyBaseHealth: number = Math.floor(Math.random() * (maxHealth - minHealth + 1) + minHealth);

        this.attack = enemyBaseAttack * (1 + (currentFloorIndex / 2)) * (1 + (currentStageIndex / 2));
        this.health = enemyBaseHealth * (1 + (currentFloorIndex / 10)) * (1 + (currentStageIndex / 100));
        this.currentHealth = this.health;
    }

    damage(damage: number, run: Run, deathCallback: () => void, stageCallback: () => void, floorCallback: () => void): void {
        this.currentHealth -= damage;
        run.checkUpdateProgress(deathCallback, stageCallback, floorCallback);
    }
}
