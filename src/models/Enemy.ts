import { Run } from "./Run";

export class Enemy {
    number: number;
    isBoss: boolean;
    name: string;
    health: number;
    currentHealth: number;
    attack: number;

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
        }

        let maxHealth: number = 1500 * bossMultiplier * (1 + (currentFloorIndex / 2));
        let minHealth: number = 500 * bossMultiplier * (1 + (currentFloorIndex / 2));

        let enemyBaseAttack: number = 10 * bossMultiplier;
        let enemyBaseHealth: number = Math.floor(Math.random() * (maxHealth - minHealth + 1) + minHealth);

        this.attack = enemyBaseAttack * (1 + (currentFloorIndex / 10)) * (1 + (currentStageIndex / 100));
        this.health = enemyBaseHealth * (1 + (currentFloorIndex / 10)) * (1 + (currentStageIndex / 100));
        this.currentHealth = this.health;
    }

    damage(damage: number, run: Run, callback: () => void): void {
        this.currentHealth -= damage;
        run.checkUpdateProgress(callback, undefined);
    }
}