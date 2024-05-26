import { Color } from "./Color";
import { EventEmitter } from "./EventEmitter";
import { EnemyStage, Stage } from "./Stage";

export interface EnemyActions {
    calculateStats(stage: Stage): void;
}

export class Enemy extends EventEmitter {
    number: number;
    stage: EnemyStage;
    isLast: boolean;

    name: string;
    color: Color;
    health: number
    currentHealth: number;
    attack: number;
    gold: number;

    hasDrop: boolean;

    constructor(number: number, stage: EnemyStage, isLast: boolean) {
        super('Enemy');
        this.number = number;
        this.stage = stage;
        this.isLast = isLast;
    }

    simulateDamage(damage: number): number {
        if (damage > this.currentHealth) {
            damage = this.currentHealth;
        }
        return damage > this.currentHealth ? this.currentHealth : damage;
    }

    damage(damage: number): void {
        if (damage > this.currentHealth) {
            damage = this.currentHealth;
        }

        this.currentHealth -= damage;

        if (this.currentHealth > 0) {
            this.emit('EnemyDamaged', this);
        } else {
            this.emit('EnemyDied', this);
        }
    }
}

export class CommonEnemy extends Enemy implements EnemyActions {

    constructor(number: number, stage: EnemyStage, isLast: boolean) {
        super(number, stage, isLast);

        this.name = 'Enemy';
        this.color = new Color(86, 101, 115);
        this.hasDrop = Math.random() > 0.98;

        this.calculateStats(stage);
    }

    calculateStats(stage: Stage): void {
        let stageIndex = stage.number - 1;
        let floorIndex = stage.floor.number - 1;

        this.gold = Math.floor(Math.random() * (5 - 1));

        let maxHealth: number = 1500 * (1 + (floorIndex / 2));
        let minHealth: number = 500 * (1 + (floorIndex / 2));

        let enemyBaseAttack: number = 10;
        let enemyBaseHealth: number = Math.floor(Math.random() * (maxHealth - minHealth + 1) + minHealth);

        this.attack = enemyBaseAttack * (1 + (floorIndex / 2)) * (1 + (stageIndex / 2));
        this.health = enemyBaseHealth * (1 + (floorIndex / 10)) * (1 + (stageIndex / 100));

        this.currentHealth = this.health;
    }

}

export class MiniBossEnemy extends Enemy implements EnemyActions {

    constructor(number: number, stage: EnemyStage, isLast: boolean) {
        super(number, stage, isLast);

        this.name = 'Mini Boss';
        this.color = new Color(235, 152, 78);
        this.hasDrop = Math.random() > 0.50;

        this.calculateStats(stage);
    }

    calculateStats(stage: Stage): void {
        let stageIndex = stage.number - 1;
        let floorIndex = stage.floor.number - 1;

        let miniBossMultiplier = 1.5 * (floorIndex + 1);
        this.gold = Math.floor(Math.random() * (25 - 11) + 10);

        let maxHealth: number = 1500 * miniBossMultiplier * (1 + (floorIndex / 2));
        let minHealth: number = 1000 * miniBossMultiplier * (1 + (floorIndex / 2));

        let enemyBaseAttack: number = 15 * (1 + (miniBossMultiplier / 2));
        let enemyBaseHealth: number = Math.floor(Math.random() * (maxHealth - minHealth + 1) + minHealth);

        this.attack = enemyBaseAttack * (1 + (floorIndex / 2)) * (1 + (stageIndex / 2));
        this.health = enemyBaseHealth * (1 + (floorIndex / 10)) * (1 + (stageIndex / 100));

        this.currentHealth = this.health;
    }

}

export class BossEnemy extends Enemy implements EnemyActions {

    constructor(number: number, stage: EnemyStage, isLast: boolean) {
        super(number, stage, isLast);

        this.name = 'Boss';
        this.color = new Color(87, 49, 214);

        this.calculateStats(stage);
    }

    calculateStats(stage: Stage): void {
        let stageIndex = stage.number - 1;
        let floorIndex = stage.floor.number - 1;

        let bossMultiplier = 2 * (floorIndex + 1);
        this.gold = Math.floor(Math.random() * (25 - 11) + 10);

        let maxHealth: number = 2000 * bossMultiplier * (1 + (floorIndex / 2));
        let minHealth: number = 1000 * bossMultiplier * (1 + (floorIndex / 2));

        let enemyBaseAttack: number = 12 * (1 + (bossMultiplier / 3));
        let enemyBaseHealth: number = Math.floor(Math.random() * (maxHealth - minHealth + 1) + minHealth);

        this.attack = enemyBaseAttack * (1 + (floorIndex / 2)) * (1 + (stageIndex / 2));
        this.health = enemyBaseHealth * (1 + (floorIndex / 10)) * (1 + (stageIndex / 100));

        this.currentHealth = this.health;
    }
}