export class Character {
    health: number;
    currentHealth: number;

    hasItemThatPreventsFirstLethalDamage: boolean = false;
    hasUsedItemThatPreventsFirstLethalDamage: boolean = false;

    constructor(health: number) {
        this.health = health;
        this.currentHealth = health;
    }

    damage(damage: number, damageCallback: (damage: number) => void, deathCallback: () => void): void {
        if (this.hasItemThatPreventsFirstLethalDamage && !this.hasUsedItemThatPreventsFirstLethalDamage) {
            if (damage >= this.currentHealth) {
                damage = 0;
                this.hasUsedItemThatPreventsFirstLethalDamage = true;
            }
        }
        
        this.currentHealth -= damage;
        if (this.currentHealth <= 0) {
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
