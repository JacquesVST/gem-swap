import { EventEmitter } from "../controllers/EventEmitter";
import { IEnemy } from "../interfaces";
import { Color } from "./Color";
import { EnemyStage, Stage } from "./Stage";

export class Enemy extends EventEmitter implements IEnemy {
    maxHealth: number
    health: number;
    attack: number;
    gold: number;
    name: string;

    number: number;
    hasDrop: boolean;
    isLast: boolean;
    stage: EnemyStage;
    color: Color;

    constructor(number: number, stage: EnemyStage, isLast: boolean) {
        super('Enemy');
        this.number = number;
        this.stage = stage;
        this.isLast = isLast;
    }

    simulateDamage(damage: number): number {
        return damage > this.health ? this.health : damage;
    }

    damage(damage: number): void {
        this.health -= damage;

        if (this.health > 0) {
            this.emit('EnemyDamaged', this);
        } else {
            this.emit('EnemyDied', this);
        }
    }
}

export class CommonEnemy extends Enemy {

    constructor(number: number, stage: EnemyStage, isLast: boolean) {
        super(number, stage, isLast);

        this.name = 'Enemy';
        this.color = new Color(86, 101, 115);
        this.hasDrop = Math.random() > 0.95;

        this.calculateStats(stage);
    }

    calculateStats(stage: Stage): void {
        const stageIndex = stage.number - 1;
        const floorIndex = stage.floor.number - 1;

        this.gold = Math.floor(Math.random() * (5 - 1));

        const maxHealth: number = 1500 * (1 + floorIndex);
        const minHealth: number = 500 * (1 + floorIndex);

        const enemyBaseAttack: number = 10;
        const enemyBaseHealth: number = Math.floor(Math.random() * (maxHealth - minHealth + 1) + minHealth);

        this.attack = Math.floor(enemyBaseAttack * (1 + ((floorIndex ** 1.2) / 2)) * (1 + (stageIndex / 50)));
        this.maxHealth = enemyBaseHealth * (1 + ((floorIndex ** 1.05) / 10)) * (1 + (stageIndex / 100));
        this.health = this.maxHealth;
    }

}

export class MiniBossEnemy extends Enemy {

    constructor(number: number, stage: EnemyStage, isLast: boolean) {
        super(number, stage, isLast);

        this.name = 'Mini Boss';
        this.color = new Color(235, 152, 78);
        this.hasDrop = Math.random() > 0.20;

        this.calculateStats(stage);
    }

    calculateStats(stage: Stage): void {
        const stageIndex = stage.number - 1;
        const floorIndex = stage.floor.number - 1;

        const miniBossMultiplier = 1.5 * (floorIndex + 1);
        this.gold = Math.floor(Math.random() * (25 - 11) + 10);

        const maxHealth: number = 1500 * miniBossMultiplier * (1 + floorIndex);
        const minHealth: number = 1000 * miniBossMultiplier * (1 + floorIndex);

        const enemyBaseAttack: number = 15;
        const enemyBaseHealth: number = Math.floor(Math.random() * (maxHealth - minHealth + 1) + minHealth);

        this.attack = Math.floor(enemyBaseAttack * (1 + ((floorIndex ** 1.2) / 2)) * (1 + (stageIndex / 20)));
        this.maxHealth = enemyBaseHealth * (1 + ((floorIndex ** 1.05) / 10)) * (1 + (stageIndex / 100));

        this.health = this.maxHealth;
    }

}

export class BossEnemy extends Enemy {

    constructor(number: number, stage: EnemyStage, isLast: boolean) {
        super(number, stage, isLast);

        this.name = 'Boss';
        this.color = new Color(87, 49, 214);

        this.calculateStats(stage);
    }

    calculateStats(stage: Stage): void {
        const stageIndex = stage.number - 1;
        const floorIndex = stage.floor.number - 1;

        const bossMultiplier = 2 * (floorIndex + 1);
        this.gold = Math.floor(Math.random() * (25 - 11) + 10);

        const maxHealth: number = 3000 * bossMultiplier * (1 + floorIndex);
        const minHealth: number = 2500 * bossMultiplier * (1 + floorIndex);

        const enemyBaseAttack: number = 20;
        const enemyBaseHealth: number = Math.floor(Math.random() * (maxHealth - minHealth + 1) + minHealth);

        this.attack = Math.floor(enemyBaseAttack * (1 + ((floorIndex ** 1.2) / 2)) * (1 + (stageIndex / 20)));
        this.maxHealth = enemyBaseHealth * (1 + ((floorIndex ** 1.05) / 10)) * (1 + (stageIndex / 100));

        this.health = this.maxHealth;
    }
}