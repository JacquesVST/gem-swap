export class Character {
    health: number;
    currentHealth: number;

    constructor(health: number) {
        this.health = health;
        this.currentHealth = health;
    }

    damage(damage: number, damageCallback: (damage: number) => void, deathCallback: () => void): void {
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
