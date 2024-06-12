
export interface IPosition {
    x: number;
    y: number;
    checksum: string;
}

export interface IColor {
    r: number;
    g: number;
    b: number;
    a: number;
    checksum: string;
    value: [number,number,number,number]

    alpha(a: number): IColor;
}

export interface ILimits {
    min: IPosition;
    max: IPosition;
}
