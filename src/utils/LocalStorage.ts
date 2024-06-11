import { IBestNumbers, IRunConfigDialogField, IUnlocks } from "../interfaces";
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
        const base = flatten(RunConfig.easy().withPlayerConfig({ gold: 0 }))
        Object.keys(base).forEach((key: string) => {
            if (key !== 'difficulty' && key !== 'item') {
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
    return config
}

function rebuildValues(key: string, base: any) {
    let option: IRunConfigDialogField;

    switch (key) {
        // 0 a 1
        case 'miniBossStageChance':
        case 'shopStageChance':
        case 'itemStageChance':
        case 'relicDropChance':
            option = {
                property: key,
                currentValue: base[key],
                minValue: 0,
                maxValue: 1,
                rounding: (value) => value
            };
            break;
        //0 a 10
        case 'stageOptionsIncreaseByFloor':
            option = {
                property: key,
                currentValue: base[key],
                minValue: 0,
                maxValue: 10,
                rounding: (value) => value
            };
            break;
        // 0 a 100
        case 'criticalChance':
        case 'critical':
            option = {
                property: key,
                currentValue: base[key],
                minValue: 0,
                maxValue: 100,
                rounding: (value) => Math.round(value)
            };
            break;
        //0 a 1000
        case 'defense':
            option = {
                property: key,
                currentValue: base[key],
                minValue: 0,
                maxValue: 1000,
                rounding: (value) => Math.round(value)
            };
            break;
        //0 a 10000
        case 'gold':
        case 'criticalMultiplier':
            option = {
                property: key,
                currentValue: base[key],
                minValue: 0,
                maxValue: 10000,
                rounding: (value) => Math.round(value)
            };
            break;
        // 0.01 a 1
        case 'enemyDropChance':
        case 'miniBossDropChance':
        case 'miniBossCountRatio':
            option = {
                property: key,
                currentValue: base[key],
                minValue: 0.01,
                maxValue: 1,
                rounding: (value) => value
            };
            break;
        // 0.01 a 100
        case 'costMultiplier':
        case 'enemyHealthAttackScale':
        case 'miniBossHealthAttackScale':
        case 'bossHealthAttackScale':
        case 'enemyGoldScale':
        case 'relicPowerMultiplier':
            option = {
                property: key,
                currentValue: base[key],
                minValue: 0.01,
                maxValue: 100,
                rounding: (value) => value
            };
            break;
        //1 a 20
        case 'stageOptions':
        case 'itemOptions':
        case 'shopOptions':
            option = {
                property: key,
                currentValue: base[key],
                minValue: 1,
                maxValue: 20,
                rounding: (value) => Math.round(value)
            };
            break;

        // 1 a 100
        case 'enemies':
        case 'stages':
        case 'floors':
            option = {
                property: key,
                currentValue: base[key],
                minValue: 1,
                maxValue: 100,
                rounding: (value) => Math.round(value)
            };
            break;
        //1 a 1000
        case 'attack':
        case 'maxMoves':
            option = {
                property: key,
                currentValue: base[key],
                minValue: 1,
                maxValue: 1000,
                rounding: (value) => Math.round(value)
            };
            break;
        //1 a 10000
        case 'multiplier':
        case 'maxHealth':
            option = {
                property: key,
                currentValue: base[key],
                minValue: 1,
                maxValue: 10000,
                rounding: (value) => Math.round(value)
            };
            break;
        //3 a 7
        case 'shapeCount':
            option = {
                property: key,
                currentValue: base[key],
                minValue: 3,
                maxValue: 7,
                rounding: (value) => Math.round(value)
            };
            break;
        //3 a 24
        case 'gridY':
            option = {
                property: key,
                currentValue: base[key],
                minValue: 3,
                maxValue: 24,
                rounding: (value) => Math.round(value)
            };
            break;
        //3 a 36
        case 'gridX':
            option = {
                property: key,
                currentValue: base[key],
                minValue: 3,
                maxValue: 36,
                rounding: (value) => Math.round(value)
            };
            break;

        //bool
        case 'startWithRelic':
            option = {
                property: key,
                currentValue: base[key],
                minValue: 0,
                maxValue: 1,
                rounding: (value) => Math.round(value)
            };
            break;
    }

    return option;
}

export function setRunConfig(config: IRunConfigDialogField[]): void {
    return localStorage.setItem('config', JSON.stringify(config));
}