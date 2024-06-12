import { IBestNumbers, IRunConfigDialogField, IUnlocks } from "../interfaces";
import { Color } from "../models/Color";
import { RunConfig } from "../models/RunConfig";
import { flatten } from "./General";

export function getBestNumbers(): IBestNumbers {
    let bests: IBestNumbers = JSON.parse(localStorage.getItem('bests'))
    return bests ? bests : { bestCombo: 0, bestDamage: 0, bestScore: 0 }
}

export function setBestNumbers(numbers: IBestNumbers): void {
    return localStorage.setItem('bests', JSON.stringify(numbers));
}

export function getXP(): number {
    return JSON.parse(localStorage.getItem('xp'))
}

export function setXP(xp: number): void {
    return localStorage.setItem('xp', JSON.stringify(xp));
}

export function getUnlocks(): IUnlocks[] {
    const unlocks: IUnlocks[] = JSON.parse(localStorage.getItem('unlocks'))
    return unlocks ? unlocks : [];
}

export function setUnlocks(unlocks: IUnlocks[]): void {
    return localStorage.setItem('unlocks', JSON.stringify(unlocks));
}

export function getRunConfig(): IRunConfigDialogField[] {
    let config: IRunConfigDialogField[] = JSON.parse(localStorage.getItem('config'))

    config = config ? config : [];

    if (config.length === 0) {
        const base = flatten(RunConfig.hard());
        Object.keys(base).forEach((key: string) => {
            if (key !== 'difficulty' && key !== 'passive') {
                let option: IRunConfigDialogField = rebuildValues(key, base);
                config.push(option);
            }
        });
    } else {
        config.forEach((value: IRunConfigDialogField, index: number) => {
            let base = {};
            base[value.property] = value.currentValue
            config[index] = rebuildValues(value.property, base);
        })
    }

    config.sort((a, b) => a.order > b.order ? 1 : -1);
    return config
}

function rebuildValues(key: string, base: any) {
    let option: IRunConfigDialogField = {
        property: key,
        currentValue: base[key],
    };

    switch (key) {

        // IGridConfig

        case 'colorCount':
            option = {
                ...option,
                minValue: 3,
                maxValue: 7,
                order: 0,
                split: 'Grid',
                color: Color.BLUE,
                rounding: (value) => Math.round(value),
                formatNumber: (value) => `${value} Colors`
            };
            break;
        case 'gridWidth':
            option = {
                ...option,
                minValue: 3,
                maxValue: 36,
                order: 1,
                rounding: (value) => Math.round(value),
                formatNumber: (value) => `${value} Cells`
            };
            break;
        case 'gridHeight':
            option = {
                ...option,
                minValue: 3,
                maxValue: 24,
                order: 2,
                rounding: (value) => Math.round(value),
                formatNumber: (value) => `${value} Cells`
            };
            break;

        // IMapConfig

        case 'floors':
            option = {
                ...option,
                minValue: 1,
                maxValue: 100,
                order: 10,
                split: 'Map',
                color: Color.YELLOW,
                rounding: (value) => Math.round(value),
                formatNumber: (value) => value + ''
            };
            break;
        case 'stages':
            option = {
                ...option,
                minValue: 1,
                maxValue: 100,
                order: 11,
                rounding: (value) => Math.round(value),
                formatNumber: (value) => value + ''
            };
            break;
        case 'enemies':
            option = {
                ...option,
                minValue: 1,
                maxValue: 100,
                order: 12,
                rounding: (value) => Math.round(value),
                formatNumber: (value) => value + ''
            };
            break;
        case 'miniBossToEnemyRatio':
            option = {
                ...option,
                minValue: 1,
                maxValue: 100,
                order: 13,
                rounding: (value) => value,
                formatNumber: (value) => Math.round(value) + '%'
            };
            break;
        case 'miniBossStageChance':
            option = {
                ...option,
                minValue: 0,
                maxValue: 100,
                order: 14,
                rounding: (value) => value,
                formatNumber: (value) => Math.round(value) + '%'
            };
            break;
        case 'itemStageChance':
            option = {
                ...option,
                minValue: 0,
                maxValue: 100,
                order: 15,
                rounding: (value) => value,
                formatNumber: (value) => Math.round(value) + '%'
            };
            break;
        case 'shopStageChance':
            option = {
                ...option,
                minValue: 0,
                maxValue: 100,
                order: 16,
                rounding: (value) => value,
                formatNumber: (value) => Math.round(value) + '%'
            };
            break;
        case 'stageOptions':
            option = {
                ...option,
                minValue: 1,
                maxValue: 20,
                order: 17,
                rounding: (value) => Math.round(value),
                formatNumber: (value) => value + ''
            };
            break;
        case 'stageOptionsIncreaseByFloor':
            option = {
                ...option,
                minValue: 0,
                maxValue: 20,
                order: 18,
                rounding: (value) => Math.round(value) / 2,
                formatNumber: (value) => {
                    let text: string = `${value}`.padEnd(3, '.0')
                    if (value === 10) {
                        text = '10.0'
                    }
                    return text
                }
            };
            break;

        // IEnemyConfig

        case 'enemyHealthAttackScale':
            option = {
                ...option,
                minValue: 1,
                maxValue: 1000,
                order: 20,
                split: 'Enemy',
                color: Color.RED,
                rounding: (value) => value,
                formatNumber: (value) => Math.round(value) + '%'
            };
            break;
        case 'enemyDropChance':
            option = {
                ...option,
                minValue: 0,
                maxValue: 100,
                order: 21,
                rounding: (value) => value,
                formatNumber: (value) => Math.round(value) + '%'
            };
            break;
        case 'miniBossHealthAttackScale':
            option = {
                ...option,
                minValue: 1,
                maxValue: 1000,
                order: 22,
                rounding: (value) => value,
                formatNumber: (value) => Math.round(value) + '%'
            };
            break;

        case 'miniBossDropChance':
            option = {
                ...option,
                minValue: 0,
                maxValue: 100,
                order: 23,
                rounding: (value) => value,
                formatNumber: (value) => Math.round(value) + '%'
            };
            break;
        case 'bossHealthAttackScale':
            option = {
                ...option,
                minValue: 1,
                maxValue: 1000,
                order: 24,
                rounding: (value) => value,
                formatNumber: (value) => Math.round(value) + '%'
            };
            break;
        case 'enemyGoldScale':
            option = {
                ...option,
                minValue: 0,
                maxValue: 1000,
                order: 25,
                rounding: (value) => value,
                formatNumber: (value) => Math.round(value) + '%'
            };
            break;

        // IPlayerConfig

        case 'attack':
            option = {
                ...option,
                minValue: 1,
                maxValue: 1000,
                order: 30,
                split: 'Player',
                color: Color.GREEN,
                rounding: (value) => Math.round(value),
                formatNumber: (value) => value + ''
            };
            break;
        case 'defense':
            option = {
                ...option,
                minValue: 0,
                maxValue: 1000,
                order: 31,
                rounding: (value) => Math.round(value),
                formatNumber: (value) => value + ''
            };
            break;
        case 'maxHealth':
            option = {
                ...option,
                minValue: 1,
                maxValue: 10000,
                order: 32,
                rounding: (value) => Math.round(value),
                formatNumber: (value) => value + ''
            };
            break;
        case 'maxMoves':
            option = {
                ...option,
                minValue: 1,
                maxValue: 1000,
                order: 33,
                rounding: (value) => Math.round(value),
                formatNumber: (value) => value + ''
            };
            break;
        case 'multiplier':
            option = {
                ...option,
                minValue: 1,
                maxValue: 1000,
                order: 34,
                rounding: (value) => Math.round(value),
                formatNumber: (value) => value + '%'
            };
            break;
        case 'critical':
            option = {
                ...option,
                minValue: 1,
                maxValue: 1000,
                order: 35,
                rounding: (value) => Math.round(value),
                formatNumber: (value) => value + ''
            };
            break;
        case 'criticalChance':
            option = {
                ...option,
                minValue: 0,
                maxValue: 100,
                order: 36,
                rounding: (value) => Math.round(value),
                formatNumber: (value) => value + '%'
            };
            break;
        case 'criticalMultiplier':
            option = {
                ...option,
                minValue: 100,
                maxValue: 1000,
                order: 37,
                rounding: (value) => Math.round(value),
                formatNumber: (value) => value + '%'
            };
            break;
        case 'gold':
            option = {
                ...option,
                minValue: 0,
                maxValue: 10000,
                order: 38,
                rounding: (value) => Math.round(value),
                formatNumber: (value) => value + ''
            };
            break;
        case 'reach':
            option = {
                ...option,
                minValue: 1,
                maxValue: 10,
                order: 39,
                rounding: (value) => Math.round(value),
                formatNumber: (value) => value + ''
            };
            break;

        // IItemConfig
        case 'itemOptions':
            option = {
                ...option,
                minValue: 1,
                maxValue: 20,
                order: 40,
                split: 'Item',
                color: Color.ORANGE,
                rounding: (value) => Math.round(value),
                formatNumber: (value) => value + ''
            };
            break;
        case 'shopOptions':
            option = {
                ...option,
                minValue: 1,
                maxValue: 20,
                order: 41,
                rounding: (value) => Math.round(value),
                formatNumber: (value) => value + ''
            };
            break;
        case 'costMultiplier':
            option = {
                ...option,
                minValue: 1,
                maxValue: 1000,
                order: 42,
                rounding: (value) => Math.round(value),
                formatNumber: (value) => value + '%'
            };
            break;
        case 'relicDropChance':
            option = {
                ...option,
                minValue: 0,
                maxValue: 100,
                order: 43,
                rounding: (value) => Math.round(value),
                formatNumber: (value) => value + '%'
            };
            break;
        case 'relicPowerMultiplier':
            option = {
                ...option,
                minValue: 1,
                maxValue: 1000,
                order: 44,
                rounding: (value) => Math.round(value),
                formatNumber: (value) => value + '%'
            };
            break;
        case 'startWithRelic':
            option = {
                ...option,
                minValue: 0,
                maxValue: 1,
                order: 45,
                rounding: (value) => Math.round(value),
                formatNumber: (value) => value > 0 ? 'Yes' : 'No'
            };
            break;
        case 'rerolls':
            option = {
                ...option,
                minValue: 0,
                maxValue: 100,
                order: 46,
                rounding: (value) => Math.round(value),
                formatNumber: (value) => value + ''
            };
            break;
    }

    return option;
}

export function setRunConfig(config: IRunConfigDialogField[]): void {
    return localStorage.setItem('config', JSON.stringify(config));
}