import { generateId } from "../utils/Functions";
import { AnimatableObject } from "./AnimatableObject";
import { Effect } from "./Effect";
import { Position } from "./Position";
import { Run } from "./Run";
import { Shape } from "./Shape";

export class Item extends AnimatableObject {
    shape: Shape;
    position: Position;
    sideSize: number;
    id: string;
    effect: Effect;
    critical: boolean = false;

    constructor(shape: Shape, position: Position, sideSize: number) {
        super()
        this.shape = shape;
        this.position = position;
        this.sideSize = sideSize;
        this.id = generateId();
    }

    renewPosition(position: Position): Item {
        this.position = position;
        return this;
    }

    static generateRandomItem(position: Position, gridSideSize: number, run: Run): Item {
        let randomShape = Math.floor(Math.random() * run.possibleShapes.length);
        let shape = run.possibleShapes[randomShape];
        let item: Item = new Item(shape, position, gridSideSize / 3);

        run.possibleEffects.forEach((effect: Effect) => {
            let chance: number = Math.random();
            if (chance <= effect.chance) {
                item.effect = effect;
            }
        })

        return item;
    }
}
