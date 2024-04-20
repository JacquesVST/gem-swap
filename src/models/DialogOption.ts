import * as p5 from "p5";
import { Color } from "./Color";
import { Reward } from "./Reward";

export class DialogOption {
    p5: p5;
    reward: Reward;
    disabled: boolean;
    color: Color;
    action: () => void;
    limits: number[];

    constructor(p5: p5, reward: Reward, disabled: boolean, color: Color, action: () => void) {
        this.p5 = p5;
        this.reward = reward;
        this.disabled = disabled
        this.color = color;
        this.action = action;
    }
}