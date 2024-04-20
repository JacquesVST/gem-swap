import { Color } from "./Color";

export class ProgressBar {
    maxValue: number;
    value: number;
    title: string;
    color: Color;

    constructor(maxValue: number, value: number, title: string, color: Color) {
        this.maxValue = maxValue,
            this.value = value,
            this.title = title,
            this.color = color;
    }
}
