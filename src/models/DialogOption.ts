import * as p5 from "p5";
import { Color } from "./Color";

export class DialogOption {
    p5: p5;
    title: string;
    message: string;
    icon: string;
    disabled: boolean;
    color: Color;
    action: () => void;
    limits: number[];

    constructor(p5: p5, title: string, message: string, icon: string, disabled: boolean, color: Color, action: () => void) {
        this.p5 = p5;
        this.title = title;
        this.message = message;
        this.icon = icon;
        this.disabled = disabled
        this.color = color;
        this.action = action;
    }
}