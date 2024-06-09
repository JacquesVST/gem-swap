import { IAnimatable } from "./Animation";
import { IColor, ILimits } from "./General";
import { IMap } from "./Map";
import { ICanvas, ISound } from "./P5";
import { IEffect, IShape } from "./Piece";
import { IPlayer } from "./Player";

export interface IRun {
    player: IPlayer;
    costMultiplier: number;

    canvas: ICanvas;
    map: IMap;
    possibleShapes: IShape[];

    score: number;
    combo: number;
    damage: number;
    dots: number;
    itemOptions: number;
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

export interface IRunConfig {
    enemies: number;
    stages: number;
    floors: number;
    gridX: number;
    gridY: number
    costMultiplier: number;
    difficulty: Difficulty
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
    DEBUG
}