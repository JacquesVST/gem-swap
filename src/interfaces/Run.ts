import { IAnimatable } from "./Animation";
import { IColor, ILimits } from "./General";
import { IItem } from "./Item";
import { IMap } from "./Map";
import { ICanvas, ISound } from "./P5";
import { IEffect, IShape } from "./Piece";
import { IPlayer } from "./Player";

export interface IRun {
    player: IPlayer;
    runConfig: IRunConfig;

    canvas: ICanvas;
    map: IMap;
    possibleShapes: IShape[];

    score: number;
    combo: number;
    damage: number;
    dots: number;
    defeatedEnemies: number;
    consecutiveCombo: number;
    possibleEffects: IEffect[];
    inAnimation: boolean;
    stackCombo: boolean;
    enemyDetailsOpen: boolean;

    sounds: ISound;
    itemData: IRunItemData;
}

export interface IRunItemData {
    lastShapeIds: string[];
    wasDiagonalMove: boolean;
    lastDialogParams: any
}

export interface IProgressBar extends IAnimatable {
    maxValue: number;
    value: number;
    title: string;
    color: IColor;

    index: number;
    top: boolean;
    limits: ILimits;
}

export interface IEnemyConfig {
    enemyHealthAttackScale?: number;
    miniBossHealthAttackScale?: number;
    bossHealthAttackScale?: number;
    enemyDropChance?: number;
    miniBossDropChance?: number;
    enemyGoldScale?: number;
}

export interface IStageConfig {
    stageOptions?: number;
    stageOptionsIncreaseByFloor?: number;
    miniBossStageChance?: number;
    itemStageChance?: number;
    shopStageChance?: number;
    miniBossCountRatio?: number;
}

export interface IItemConfig {
    itemOptions?: number;
    shopOptions?: number;
    relicPowerMultiplier?: number;
    relicDropChance?: number;
}

export interface IPlayerConfig {
    gold?: number;
    attack?: number;
    defense?: number;
    maxHealth?: number;
    maxMoves?: number;
    multiplier?: number;
    critical?: number;
    criticalChance?: number;
    criticalMultiplier?: number;
    startWithRelic?: boolean;
}

export interface IGeneralConfig {
    shapeCount?: number;
}

export interface IRunConfigBase {
    enemies?: number;
    stages?: number;
    floors?: number;
    gridX?: number;
    gridY?: number
    costMultiplier?: number;
    item?: IItem;
    difficulty?: Difficulty
}

export interface IRunConfig extends IRunConfigBase {
    enemy: IEnemyConfig
    general: IGeneralConfig
    items: IItemConfig
    player: IPlayerConfig;
    stage: IStageConfig
}

export interface IRunConfigDialogField {
    property: string,
    currentValue: number,
    minValue: number,
    maxValue: number,
    limits?: ILimits;
    rounding?: (value: number) => number
}

export interface IBestNumbers {
    bestCombo: number;
    bestScore: number;
    bestDamage: number;
}

export enum ProgressBarIndexes {
    FLOOR,
    STAGE,
    ENEMY,
    MOVES,
    HEALTH
}

export enum Difficulty {
    EASY,
    MEDIUM,
    HARD,
    MASTER,
    CUSTOM
}