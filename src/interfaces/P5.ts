import * as P5 from "p5";
import { IPosition } from "./General";

export interface ISound {
    [key: string]: P5.SoundFile;
}

export interface ICanvas {
    p5: P5;
    margin: number;
    radius: number;
    padding: number;
    itemSideSize: number
    windowSize: IPosition;
    playfield: IPosition;
    mousePosition: IPosition;
    uiData: IUiData;
    gridData: IGridData;

    calculateAndCreatePlayfield: () => void;
    calculateUiSize: (uiData: IUiData) => IUiData;
    draw: () => void;
}

export interface IGridData {
    cellSideSize: number;
    totalGridHeight: number;
    horizontalCenterPadding: number;
    verticalCenterPadding: number;
    marginLeft: number;
    marginRight: number;
    marginTop: number;
    marginBottom: number;
}

export interface IUiData {
    bottomBarCount: number;
    bottomUiSize?: number;
    fontDetail?: number;
    fontSubText?: number;
    fontText?: number;
    fontTitle?: number;
    topBarCount: number;
    topUiSize?: number;
    uiBarSize: number;
}