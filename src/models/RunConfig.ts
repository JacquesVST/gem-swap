import { Difficulty, IEnemyConfig, IGeneralConfig, IItemConfig, IPlayerConfig, IRunConfig, IRunConfigBase, IStageConfig } from "../interfaces";
import { Item } from "./Item";

export class RunConfig implements IRunConfig {
    enemies: number;
    stages: number;
    floors: number;
    gridX: number;
    gridY: number
    costMultiplier: number;
    difficulty: Difficulty
    item: Item;
    enemy: IEnemyConfig
    stage: IStageConfig
    items: IItemConfig
    general: IGeneralConfig
    player: IPlayerConfig;

    constructor(
        config: IRunConfigBase
    ) {
        this.enemies = config.enemies;
        this.stages = config.stages;
        this.floors = config.floors;
        this.gridX = config.gridX;
        this.gridY = config.gridY;
        this.costMultiplier = config.costMultiplier;
        this.difficulty = config.difficulty;

        this.enemy = RunConfig.defaultEnemyConfig();
        this.stage = RunConfig.defaultStageConfig();
        this.items = RunConfig.defaultItemConfig();
        this.player = RunConfig.defaultPlayerConfig();
        this.general = RunConfig.defaultGeneralConfig();
    }

    static defaultEnemyConfig(): IEnemyConfig {
        return {
            enemyHealthAttackScale: 1,
            miniBossHealthAttackScale: 1,
            bossHealthAttackScale: 1,
            enemyDropChance: 0.05,
            miniBossDropChance: 0.20,
            enemyGoldScale: 1
        };
    }

    static defaultStageConfig(): IStageConfig {
        return {
            stageOptions: 2,
            stageOptionsIncreaseByFloor: 0.5,
            miniBossStageChance: 0.15,
            itemStageChance: 0.10,
            shopStageChance: 0.05,
            miniBossCountRatio: 0.33
        };
    }

    static defaultItemConfig(): IItemConfig {
        return {
            itemOptions: 3,
            shopOptions: 3,
            relicPowerMultiplier: 1,
            relicDropChance: 0.1,
        };
    }

    static defaultPlayerConfig(): IPlayerConfig {
        return {
            gold: 0,
            attack: 100,
            defense: 0,
            maxHealth: 100,
            maxMoves: 10,
            multiplier: 100,
            critical: 1,
            criticalChance: 0,
            criticalMultiplier: 175,
            startWithRelic: false
        };
    }


    static defaultGeneralConfig(): IGeneralConfig {
        return {
            shapeCount: 6
        };
    }

    withEnemyConfig(newConfig: IEnemyConfig) {
        this.enemy = RunConfig.defaultEnemyConfig();

        if (newConfig) {
            Object.keys(newConfig).forEach((key: string) => {
                if (newConfig[key]) {
                    this.enemy[key] = newConfig[key];
                }
            });
        }
        return this;
    }

    withStageConfig(newConfig: IStageConfig) {
        this.stage = RunConfig.defaultStageConfig();

        if (newConfig) {
            Object.keys(newConfig).forEach((key: string) => {
                if (newConfig[key]) {
                    this.stage[key] = newConfig[key];
                }
            });
        }

        return this;
    }

    withItemConfig(newConfig: IItemConfig) {
        this.items = RunConfig.defaultItemConfig();

        if (newConfig) {
            Object.keys(newConfig).forEach((key: string) => {
                if (newConfig[key]) {
                    this.items[key] = newConfig[key];
                }
            });
        }

        return this;
    }

    withPlayerConfig(newConfig: IPlayerConfig) {
        this.player = RunConfig.defaultPlayerConfig();

        if (newConfig) {
            Object.keys(newConfig).forEach((key: string) => {
                if (newConfig[key]) {
                    this.player[key] = newConfig[key];
                }
            });
        }

        return this;
    }

    withGeneralConfig(newConfig: IGeneralConfig) {
        this.general = RunConfig.defaultGeneralConfig();

        if (newConfig) {
            Object.keys(newConfig).forEach((key: string) => {
                if (newConfig[key]) {
                    this.general[key] = newConfig[key];
                }
            });
        }

        return this;
    }

    static easy(item?: Item): RunConfig {
        return new RunConfig({
            enemies: 5,
            stages: 3,
            floors: 3,
            gridX: 12,
            gridY: 8,
            costMultiplier: 1,
            difficulty: Difficulty.EASY
        }).withEnemyConfig({
            enemyGoldScale: 2,
        }).withPlayerConfig({
            gold: 30,
        })
        
        .withItem(item);
    }

    static medium(item?: Item): RunConfig {
        return new RunConfig({
            enemies: 8,
            stages: 5,
            floors: 5,
            gridX: 10,
            gridY: 8,
            costMultiplier: 1.5,
            difficulty: Difficulty.MEDIUM
        }).withEnemyConfig({
            enemyGoldScale: 1.5,
        }).withPlayerConfig({
            gold: 15,
        }).withItem(item);
    }

    static hard(item?: Item): RunConfig {
        return new RunConfig({
            enemies: 10,
            stages: 8,
            floors: 8,
            gridX: 8,
            gridY: 6,
            costMultiplier: 2,
            difficulty: Difficulty.HARD
        }).withItem(item);
    }

    static master(item?: Item): RunConfig {
        return new RunConfig({
            enemies: 10,
            stages: 10,
            floors: 10,
            gridX: 8,
            gridY: 6,
            costMultiplier: 2,
            difficulty: Difficulty.MASTER
        }).withStageConfig({
            miniBossStageChance: 0.30
        }).withGeneralConfig({
            shapeCount: 7
        }).withItem(item);
    }

    withItem(item: Item): RunConfig {
        this.item = item;

        if (item?.name === 'No Barriers') {
            this.gridX += 1;
            this.gridY += 1
        }

        if (item?.name === 'Less Is More') {
            this.gridX -= 1;
            this.gridY -= 1;
        }

        if (item?.name === 'Collector') {
            this.player.startWithRelic = true;
        }

        if (item?.name === 'Natural Crit') {
            this.player.criticalMultiplier = 250;
            this.player.criticalChance = 5;
        }

        if (item?.name === '4x4') {
            this.player.multiplier = 400;
        }

        if (item?.name === 'Tank') {
            this.player.defense = 10;
            this.player.maxMoves -= 2;
        }

        return this;
    }
}