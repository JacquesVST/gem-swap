import { Reward } from "./Reward";

export class Character {
    health: number;
    attack: number;
    defense: number;
    moves: number;
    currentHealth: number;
    
    rewards: Reward[] = [];
    activeItem: Reward;
    hasItemThatPreventsFirstLethalDamage: boolean = false;
    hasUsedItemThatPreventsFirstLethalDamage: boolean = false;
    hpRegenFromReward: number = 0;
    damageMultiplier: number = 1;
    moveSaver: number = 0;
    gold: number = 0;

    constructor(health: number, attack: number, defense: number, moves: number) {
        this.health = health;
        this.attack = attack;
        this.defense = defense;
        this.moves = moves;
        this.currentHealth = health;
    }

    static defaultCharacter() {
        return new Character(100, 100, 0,  0);
    }

    hasReward(name: string): boolean {
        return this.rewards.map((reward: Reward) => reward.name).includes(name);
    }

    heal(heal: number): void {
        if (this.currentHealth + heal > this.health) {
            heal = this.health - this.currentHealth;
        }

        this.currentHealth += heal;
    }

    takeDamage(damage: number, damageCallback: (damage: number, shielded: boolean) => void, deathCallback: () => void): void {
       let shielded = false;
       damage -= this.defense;
        if (this.hasItemThatPreventsFirstLethalDamage && !this.hasUsedItemThatPreventsFirstLethalDamage) {
            if (damage >= this.currentHealth) {
                damage = 0;
                this.hasUsedItemThatPreventsFirstLethalDamage = true;
                this.rewards = this.rewards.filter((reward: Reward) => reward.name !== 'Shield');
                shielded = true
            }
        } else {
            if (damage > this.currentHealth) {
                damage = this.currentHealth
            }
        }
        
        this.currentHealth -= damage;
        if (this.currentHealth - 1 <= 0) {
            if (deathCallback) {
                deathCallback();
            }
        }
        if (damageCallback) {
            damageCallback(damage, shielded);
        }
    }
}


