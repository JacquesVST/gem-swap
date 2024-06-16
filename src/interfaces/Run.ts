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
    rerolled?: boolean
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

export interface IItemConfig {
    itemOptions?: number;
    shopOptions?: number;
    costMultiplier?: number;
    relicDropChance?: number;
    relicPowerMultiplier?: number;
    startWithRelic?: number;
    rerolls?: number;
}

export interface IPlayerConfig {
    attack?: number;
    defense?: number;
    maxHealth?: number;
    maxMoves?: number;
    multiplier?: number;
    critical?: number;
    criticalChance?: number;
    criticalMultiplier?: number;
    gold?: number;
    reach?: number;
    luck?: number;
}

export interface IEnemyConfig {
    enemyHealthAttackScale?: number;
    enemyDropChance?: number;
    miniBossHealthAttackScale?: number;
    miniBossDropChance?: number;
    bossHealthAttackScale?: number;
    enemyGoldScale?: number;
}

export interface IMapConfig {
    floors?: number;
    stages?: number;
    enemies?: number;
    miniBossToEnemyRatio?: number;
    miniBossStageChance?: number;
    itemStageChance?: number;
    shopStageChance?: number;
    stageOptions?: number;
    stageOptionsIncreaseByFloor?: number;
}

export interface IGridConfig {
    colorCount?: number;
    gridWidth?: number;
    gridHeight?: number;
}

export interface IRunConfig {
    difficulty?: Difficulty
    passive?: IItem
    grid: IGridConfig
    map: IMapConfig
    enemy: IEnemyConfig
    player: IPlayerConfig
    item: IItemConfig
}

export interface IFlatRunConfig {
    attack?: number;
    bossHealthAttackScale?: number;
    colorCount?: number;
    costMultiplier?: number;
    critical?: number;
    criticalChance?: number;
    criticalMultiplier?: number;
    defense?: number;
    enemies?: number;
    enemyDropChance?: number;
    enemyGoldScale?: number;
    enemyHealthAttackScale?: number;
    floors?: number;
    gold?: number;
    gridWidth?: number;
    gridHeight?: number;
    itemOptions?: number;
    itemStageChance?: number;
    luck?: number;
    maxHealth?: number;
    maxMoves?: number;
    miniBossDropChance?: number;
    miniBossHealthAttackScale?: number;
    miniBossStageChance?: number;
    miniBossToEnemyRatio?: number;
    multiplier?: number;
    relicDropChance?: number;
    relicPowerMultiplier?: number;
    shopOptions?: number;
    shopStageChance?: number;
    stageOptions?: number;
    stageOptionsIncreaseByFloor?: number;
    stages?: number;
    startWithRelic?: number;
}
export interface IRunConfigDialogField {
    property: string,
    currentValue: number,
    minValue?: number,
    maxValue?: number,
    order?: number,
    split?: string,
    limits?: ILimits;
    color?: IColor;
    rounding?: (value: number) => number
    formatNumber?: (value: number) => string
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