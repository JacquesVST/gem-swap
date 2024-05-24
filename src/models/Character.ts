import { EventEmitter } from "./EventEmitter";
import { Item } from "./Item";

export class Character extends EventEmitter {
    health: number;
    attack: number;
    defense: number;
    moves: number;
    currentHealth: number;

    critical: number = 1;
    bossCritical: number = 0;

    items: Item[] = [];
    activeItem: Item;
    hasItemThatPreventsFirstLethalDamage: boolean = false;
    hasUsedItemThatPreventsFirstLethalDamage: boolean = false;
    hpRegenFromItem: number = 0;
    damageMultiplier: number = 1;
    criticalMultiplier: number = 2;
    moveSaver: number = 0;
    gold: number = 0;

    constructor(health: number, attack: number, defense: number, moves: number) {
        super();
        this.health = health;
        this.attack = attack;
        this.defense = defense;
        this.moves = moves;
        this.currentHealth = health;
    }

    static defaultCharacter(): Character {
        return new Character(100, 100, 0, 0);
    }

    get movesEnded(): boolean {
        return this.moves === 0;
    }

    hasItem(name: string): boolean {
        return this.items.map((item: Item) => item.name).includes(name);
    }

    heal(heal: number): void {
        if (this.currentHealth + heal > this.health) {
            heal = this.health - this.currentHealth;
        }

        this.currentHealth += heal;
    }

    simulateDamage(damage: number): DamageData {
        if (!damage || !parseInt(damage + '', 10)) {
            damage = 0;
        }

        let shielded = false;
        damage = (damage - this.defense < 0) ? 0 : (damage - this.defense);

        if (this.hasItemThatPreventsFirstLethalDamage && !this.hasUsedItemThatPreventsFirstLethalDamage) {
            if (damage >= this.currentHealth) {
                damage = 0;
                this.hasUsedItemThatPreventsFirstLethalDamage = true;
                this.items = this.items.filter((item: Item) => item.name !== 'Shield');
                shielded = true
            }
        } else {
            if (damage > this.currentHealth) {
                damage = this.currentHealth
            }
        }

        return { damage, shielded };
    }

    damage(damage: DamageData): void {
        this.currentHealth -= damage.damage;

        this.emit('PlayerDamaged', this);

        if (this.currentHealth <= 0) {
            this.emit('PlayerDied');
        }
    }

    updateMoves(newMoves: number): void {
        this.moves = newMoves;

        this.emit('MovesUpdated', this)
    }
}

export interface DamageData {
    damage: number;
    shielded: boolean;
}