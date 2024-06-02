
import { IButton } from "../interfaces";
import { drawClickableBox } from "../utils/Draw";
import { generateId } from "../utils/General";
import { Color } from "./Color";
import { Limits } from "./Limits";
import { Position } from "./Position";
import { Run } from "./Run";

export class Button implements IButton {
    id: string;
    size: Position;
    color: Color;
    position: Position;
    disabled: boolean = false;

    content: (...params: any) => void;
    action: (...params: any) => void;

    constructor(position: Position, size: Position, color: Color, content?: (...params: any) => void, action?: (...params: any) => void) {
        this.id = generateId();
        this.position = position;
        this.size = size
        this.color = color;

        content = content;
        action = action;
    }

    get limits(): Limits {
        return this.position.toLimits(this.size);
    }

    draw(run?: Run): void {
        drawClickableBox(this.position, this.size, this.color);
        this.content();
    }

}