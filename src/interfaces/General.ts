export interface IPosition {
    x: number;
    y: number;
    checksum: string;
}

export interface IColor {
    r: number;
    g: number;
    b: number;
    a?: number;
    checksum: string;
}

export interface ILimits {
    min: IPosition;
    max: IPosition;
}
