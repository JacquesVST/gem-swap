import * as P5 from "p5";
import { Frequency, ICanvas } from "../interfaces";
import { Color } from "../models/Color";
import { ItemDialogOption } from "../models/Dialog";
import { Item } from "../models/Item";
import { Limits } from "../models/Limits";
import { Position } from "../models/Position";
import { Run } from "../models/Run";
import { countOcurrences, insertLineBreaks } from "./General";

export function drawItem(item: Item, cumulativeMarginX: number, cumulativeMarginY: number, itemSideSizeX: number, itemSideSizeY: number, canvas: ICanvas, relativeFade: number = 0, run?: Run, option?: ItemDialogOption, hideDescription?: boolean) {
    const p5: P5 = canvas.p5

    let limits: Limits = new Limits(new Position(cumulativeMarginX, cumulativeMarginY), new Position(cumulativeMarginX + itemSideSizeX, cumulativeMarginY + itemSideSizeY));

    if (option) {
        option.limits = limits;
    }

    const isMouseOver: boolean = limits.contains(canvas.mousePosition)
    let opacity: number = (isMouseOver ? 255 : 200) + relativeFade
    let color: Color = Item.rarityColors[item.rarity].color;

    p5.noStroke();
    p5.fill((option?.disabled ? Color.DISABLED : color).alpha(opacity <= 0 ? 0 : opacity).value);
    p5.rect(
        cumulativeMarginX,
        cumulativeMarginY,
        itemSideSizeX,
        itemSideSizeY,
        canvas.radius * 2
    );

    p5.textAlign(p5.CENTER, p5.CENTER);
    p5.textSize(24);
    let name: string = insertLineBreaks(item.name, p5.map(itemSideSizeX - canvas.margin, 0, p5.textWidth(item.name), 0, item.name.length));
    let textMargin: number = cumulativeMarginY + (itemSideSizeY / 2);

    p5.fill(Color.WHITE.alpha(255 + relativeFade).value);
    p5.stroke(Color.BLACK.alpha(255 + relativeFade).value);
    p5.strokeWeight(3);
    p5.text(
        name,
        cumulativeMarginX + (itemSideSizeX / 2),
        textMargin - canvas.margin * (hideDescription ? 0 : 1)
    );

    if (!hideDescription) {

        p5.textSize(20);
        let description: string = insertLineBreaks(item.description, p5.map(itemSideSizeX - canvas.margin, 0, p5.textWidth(item.description), 0, item.description.length));
        let subOffset: number = (countOcurrences(name, '\n') + Math.max(1, countOcurrences(description, '\n') - 1)) * canvas.margin;

        p5.fill(200, 200, 200, 255 + relativeFade);
        p5.strokeWeight(2);
        p5.text(
            description,
            cumulativeMarginX + (itemSideSizeX / 2),
            textMargin + subOffset
        );
    }

    p5.textAlign(p5.LEFT, p5.TOP);
    p5.fill(color.alpha(255 + relativeFade).value);
    p5.stroke(0, 0, 0, 255 + relativeFade);
    p5.strokeWeight(3);
    p5.textSize(20);
    p5.text(
        item.rarity,
        cumulativeMarginX + canvas.padding,
        cumulativeMarginY + canvas.padding
    );

    if (item.unique || item.frequency !== Frequency.PASSIVE) {
        let frequency: string;

        switch (item.frequency) {
            case Frequency.SINGLE_USE:
                frequency = 'Single Use';
                break;
            case Frequency.EVERY_ENEMY:
                frequency = '1 Enemy CD';
                break;
            case Frequency.EVERY_STAGE:
                frequency = '1 Stage CD';
                break;
            case Frequency.EVERY_FLOOR:
                frequency = '1 Floor CD';
                break;
        }


        p5.textAlign(p5.RIGHT, p5.TOP);
        p5.fill([...(item.unique ? Color.YELLOW : Color.ORANGE).value, 255 + relativeFade]);
        p5.stroke(0, 0, 0, 255 + relativeFade);
        p5.strokeWeight(3);
        p5.textSize(20);
        p5.text(
            item.unique ? 'Unique' : frequency,
            cumulativeMarginX + itemSideSizeX - canvas.padding,
            cumulativeMarginY + canvas.padding
        );
    }

    if (item.price) {
        let canAfford: boolean = true;
        if (run?.player && option) {
            canAfford = run?.player.gold >= item.price;
            option.disabled = !canAfford;
        }

        p5.textAlign(p5.CENTER, p5.BOTTOM);
        p5.fill((canAfford ? Color.YELLOW : Color.RED).alpha(255 + relativeFade).value);
        p5.strokeWeight(2);
        p5.textSize(24);
        p5.text(
            `$ ${Math.floor(item.price)}`,
            cumulativeMarginX + (itemSideSizeX / 2),
            cumulativeMarginY + itemSideSizeY - canvas.padding
        );

    }
}

export function rectWithStripes(drawingPos: Position, drawingSize: Position, radius: number, stripeCount: number, isHorizontal: boolean, color1: Color, color2: Color, opacity: number, p5: P5): void {
    if (isHorizontal) {
        let stripeSize: number = drawingSize.y / stripeCount;
        for (let i = 0; i < stripeCount; i++) {
            let color: Color = color1;
            if (i % 2 === 1) {
                color = color2;
            }

            let allRadius: number[] = [0, 0, 0, 0];
            if (i === 0) {
                allRadius = [radius, radius, 0, 0];
            }

            if (i === stripeCount - 1) {
                allRadius = [0, 0, radius, radius];
            }

            p5.fill(color.alpha(opacity).value)
            p5.rect(
                drawingPos.x,
                drawingPos.y + (i * stripeSize),
                drawingSize.x,
                stripeSize,
                allRadius[0],
                allRadius[1],
                allRadius[2],
                allRadius[3]
            );
        }
    } else {
        let stripeSize: number = drawingSize.x / stripeCount;
        for (let i = 0; i < stripeCount; i++) {
            let color: Color = color1;
            if (i % 2 === 1) {
                color = color2;
            }

            let allRadius: number[] = [0, 0, 0, 0];
            if (i === 0) {
                allRadius = [radius, 0, 0, radius];
            }

            if (i === stripeCount - 1) {
                allRadius = [0, radius, radius, 0];
            }

            p5.fill(color.alpha(opacity).value);
            p5.rect(
                drawingPos.x + (i * stripeSize),
                drawingPos.y,
                stripeSize,
                drawingSize.y,
                allRadius[0],
                allRadius[1],
                allRadius[2],
                allRadius[3]
            );
        }
    }
}

export function polygon(x: number, y: number, radius: number, npoints: number, p5: P5): void {
    let angle = p5.TWO_PI / npoints;
    p5.beginShape();
    for (let a = p5.HALF_PI * 3; a < p5.HALF_PI * 7; a += angle) {
        let sx = x + p5.cos(a) * radius;
        let sy = y + p5.sin(a) * radius;
        p5.vertex(sx, sy);
    }
    p5.endShape(p5.CLOSE);
}

export function dottedLine(position1: Position, position2: Position, size: number, gap: number, p5: P5): number {
    let distance: number = p5.dist(position1.x, position1.y, position2.x, position2.y);
    let dots: number = Math.floor(distance / gap);

    let xIncrement: number = (position2.x - position1.x) / dots;
    let yIncrement: number = (position2.y - position1.y) / dots;

    for (let i: number = 0; i <= dots; i++) {
        p5.ellipse(position1.x + (i * xIncrement), position1.y + (i * yIncrement), p5.map(i, 0, dots, size / 4, size));
    }

    return dots;
}
