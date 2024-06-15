import { Difficulty, IEnemyConfig, IFlatRunConfig, IGridConfig, IItemConfig, IMapConfig, IPlayerConfig, IRunConfig } from "../interfaces";
import { Item } from "./Item";

export class RunConfig implements IRunConfig {
    difficulty?: Difficulty;
    passive?: Item;
    grid: IGridConfig;
    map: IMapConfig;
    enemy: IEnemyConfig;
    player: IPlayerConfig;
    item: IItemConfig;

    constructor(difficulty: Difficulty) {
        this.difficulty = difficulty;

        this.grid = this.defaultGridConfig();
        this.map = this.defaultMapConfig();
        this.enemy = this.defaultEnemyConfig();
        this.player = this.defaultPlayerConfig();
        this.item = this.defaultItemConfig();
    }

    defaultGridConfig(): IGridConfig {
        return {
            colorCount: 6,
            gridWidth: 8,
            gridHeight: 6
        };
    }

    defaultMapConfig(): IMapConfig {
        return {
            floors: 10,
            stages: 10,
            enemies: 10,
            miniBossToEnemyRatio: 33,
            miniBossStageChance: 15,
            itemStageChance: 10,
            shopStageChance: 5,
            stageOptions: 3,
            stageOptionsIncreaseByFloor: 0,
        };
    }

    defaultEnemyConfig(): IEnemyConfig {
        return {
            enemyHealthAttackScale: 100,
            enemyDropChance: 5,
            miniBossHealthAttackScale: 100,
            miniBossDropChance: 20,
            bossHealthAttackScale: 100,
            enemyGoldScale: 100
        };
    }

    defaultPlayerConfig(): IPlayerConfig {
        return {
            attack: 100,
            defense: 0,
            maxHealth: 100,
            maxMoves: 10,
            multiplier: 100,
            critical: 1,
            criticalChance: 0,
            criticalMultiplier: 175,
            gold: 0,
            reach: 1,
        };
    }

    defaultItemConfig(): IItemConfig {
        return {
            itemOptions: 3,
            shopOptions: 3,
            costMultiplier: 100,
            relicDropChance: 10,
            relicPowerMultiplier: 100,
            startWithRelic: 0,
            rerolls: 0,
        };
    }

    withFlatConfig(newConfig: IFlatRunConfig): RunConfig {
        if (newConfig) {
            Object.keys(newConfig).forEach((key: string) => {
                if (newConfig[key] && !isNaN(newConfig[key])) {
                    if (key in this.grid) {
                        this.grid[key] = newConfig[key];
                    }

                    if (key in this.map) {
                        this.map[key] = newConfig[key];
                    }

                    if (key in this.enemy) {
                        this.enemy[key] = newConfig[key];
                    }

                    if (key in this.player) {
                        this.player[key] = newConfig[key];
                    }

                    if (key in this.item) {
                        this.item[key] = newConfig[key];
                    }
                }
            });
        }
        return this;
    }

    withAdditiveFlatConfig(newConfig: IFlatRunConfig): RunConfig {
        if (newConfig) {
            Object.keys(newConfig).forEach((key: string) => {
                if (newConfig[key] && !isNaN(newConfig[key])) {
                    if (key in this.grid) {
                        this.grid[key] += newConfig[key];
                    }

                    if (key in this.map) {
                        this.map[key] += newConfig[key];
                    }

                    if (key in this.enemy) {
                        this.enemy[key] += newConfig[key];
                    }

                    if (key in this.player) {
                        this.player[key] += newConfig[key];
                    }

                    if (key in this.item) {
                        this.item[key] += newConfig[key];
                    }
                }
            });
        }
        return this;
    }

    static easy(passive?: Item): RunConfig {
        return new RunConfig(Difficulty.EASY)
            .withFlatConfig({
                enemies: 5,
                stages: 3,
                floors: 3,
                gridWidth: 12,
                gridHeight: 8,
                costMultiplier: 100,
                enemyGoldScale: 200,
                gold: 30,
            }).withPassive(passive);
    }

    static medium(passive?: Item): RunConfig {
        return new RunConfig(Difficulty.MEDIUM)
            .withFlatConfig({
                enemies: 8,
                stages: 5,
                floors: 5,
                gridWidth: 10,
                gridHeight: 8,
                costMultiplier: 150,
                enemyGoldScale: 150,
                gold: 15,
            }).withPassive(passive);
    }


    static hard(passive?: Item): RunConfig {
        return new RunConfig(Difficulty.HARD)
            .withFlatConfig({
                enemies: 10,
                stages: 8,
                floors: 8,
                gridWidth: 8,
                gridHeight: 6,
                costMultiplier: 200,
            }).withPassive(passive);
    }

    static master(passive?: Item): RunConfig {
        return new RunConfig(Difficulty.MASTER)
            .withFlatConfig({
                enemies: 10,
                stages: 10,
                floors: 10,
                gridWidth: 8,
                gridHeight: 6,
                costMultiplier: 2,
                miniBossStageChance: 30,
                colorCount: 7
            }).withPassive(passive);
    }

    withPassive(passive?: Item): RunConfig {
        this.passive = passive;

        if (passive) {
            if (passive?.name === '4x4') {
                this.player.multiplier += 300;
            }

            if (passive?.name === 'Collector') {
                this.item.startWithRelic = 1;
                this.item.relicPowerMultiplier += 50;
            }

            if (passive?.name === 'Gambler') {
                this.item.rerolls = 3
            }

            if (passive?.name === 'Less Is More') {
                this.grid.gridWidth -= 1;
                this.grid.gridHeight -= 1;
                this.grid.colorCount -= 1;
            }

            if (passive?.name === 'Midas Touched The Walls') {
                this.map.shopStageChance += 10;
            }

            if (passive?.name === 'Natural Crit') {
                this.player.criticalMultiplier += 75;
                this.player.criticalChance += 5;
            }

            if (passive?.name === 'No Barriers') {
                this.grid.gridWidth += 1;
                this.grid.gridHeight += 1;
                this.player.reach += 1;
            }

            if (passive?.name === 'Tank') {
                this.player.defense += 10;
                this.player.maxMoves -= 2;
            }


        }

        return this;
    }
}