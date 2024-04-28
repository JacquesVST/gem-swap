import { Reward } from "./Reward";

export class Character {
    health: number;
    currentHealth: number;
    rewards: Reward[];

    hasItemThatPreventsFirstLethalDamage: boolean = false;
    hasUsedItemThatPreventsFirstLethalDamage: boolean = false;
    hpRegenFromReward: number = 0;

    constructor(health: number) {
        this.health = health;
        this.currentHealth = health;
        this.rewards = [];
    }

    static defaultCharacter() {
        return new Character(100);
    }

    heal(heal: number): void {
        if (this.currentHealth + heal > this.health) {
            heal = this.health - this.currentHealth;
        }

        this.currentHealth += heal;
    }

    damage(damage: number, damageCallback: (damage: number) => void, deathCallback: () => void): void {
        if (this.hasItemThatPreventsFirstLethalDamage && !this.hasUsedItemThatPreventsFirstLethalDamage) {
            if (damage >= this.currentHealth) {
                damage = 0;
                this.hasUsedItemThatPreventsFirstLethalDamage = true;
                this.rewards = this.rewards.filter((reward: Reward) => reward.name !== 'Shield');
            }
        } else {
            if (damage > this.currentHealth) {
                damage = this.currentHealth
            }
        }
        
        this.currentHealth -= damage;
        if (this.currentHealth - 1 <= 0) {
            alert('YOU LOST!');
            if (deathCallback) {
                deathCallback();
            }
        }
        if (damageCallback) {
            damageCallback(damage);
        }
    }
}


