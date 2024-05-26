import * as P5 from "p5";
import { CanvasInfo } from "../models/CanvasInfo";
import { Color } from "../models/Color";
import { ItemDialogOption } from "../models/Dialog";
import { Item } from "../models/Item";
import { Position } from "../models/Position";
import { BestNumbers, Run } from "../models/Run";

export function generateId(): string {
    return "id" + Math.random().toString(16).slice(2)
}

export function canReach(pos1: Position, pos2: Position, reach: number, extended: boolean = false): boolean {
    let possibleMoves: Position[] = [];

    for (let currentReach: number = 1; currentReach <= reach; currentReach++) {
        possibleMoves.push(...[
            new Position(pos1.x - currentReach, pos1.y),
            new Position(pos1.x + currentReach, pos1.y),
            new Position(pos1.x, pos1.y - currentReach),
            new Position(pos1.x, pos1.y + currentReach)
        ]);
    }

    if (extended) {
        possibleMoves.push(...[
            new Position(pos1.x - 1, pos1.y - 1),
            new Position(pos1.x - 1, pos1.y + 1),
            new Position(pos1.x + 1, pos1.y - 1),
            new Position(pos1.x + 1, pos1.y + 1),
        ]);
    }

    return possibleMoves.map((position: Position) => position.checksum).includes(pos2.checksum);
}

export function stripesWithBorderRadius(drawingPos: Position, drawingSize: Position, radius: number, stripeCount: number, isHorizontal: boolean, color1: Color, color2: Color, opacity: number, p5: P5): void {
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

            p5.fill([...color.value, opacity]);
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

            p5.fill([...color.value, opacity]);
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

export function checkPositionInLimit(position: Position, ...coords: number[]): boolean {
    return position.x > coords[0] && position.x < coords[1] && position.y > coords[2] && position.y < coords[3];
}

export function formatNumber(number: number): string {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function hasConsecutive(array: string[], amount: number): boolean {
    let last: any;
    let count: number = 0;
    for (let index: number = 0; index < array.length; index++) {
        if (array[index] != last) {
            last = array[index];
            count = 0;
        }
        count++;
        if (amount <= count) {
            return true;
        }
    }
    return false;
}

export function getBestNumbers(): BestNumbers {
    let bests: BestNumbers = JSON.parse(localStorage.getItem('bests'))
    return bests ? bests : { bestCombo: 0, bestDamage: 0, bestScore: 0 }
}

export function setBestNumbers(numbers: BestNumbers): void {
    return localStorage.setItem('bests', JSON.stringify(numbers));
}

export function randomBetween(max: number, min: number): number {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

export function insertLineBreaks(input: string, every: number): string {
    let result: string = '';
    let currentLength: number = 0;
    let words: string[] = input.split(' ');

    for (let i: number = 0; i < words.length; i++) {
        if (currentLength + words[i].length > Math.floor(every)) {
            result += '\n';
            currentLength = 0;
        } else if (currentLength > 0) {
            result += ' ';
            currentLength++;
        }

        result += words[i];
        currentLength += words[i].length;
    }

    return result;
}
export function countOcurrences(input: string, of: string) {
    return (input.match(new RegExp(of, 'g')) || []).length;

}

export function drawItem(item: Item, cumulativeMarginX: number, cumulativeMarginY: number, itemSideSize: number, canvas: CanvasInfo, relativeFade: number = 0, run?: Run, option?: ItemDialogOption) {
    const p5: P5 = canvas.p5

    let limits: number[] = [
        cumulativeMarginX,
        cumulativeMarginX + itemSideSize,
        cumulativeMarginY,
        cumulativeMarginY + itemSideSize
    ];

    if (option) {
        option.limits = limits;
    }

    let isMouseOver: boolean = checkPositionInLimit(new Position(p5.mouseX, p5.mouseY), ...limits)
    let opacity: number = (isMouseOver ? 255 : 200) + relativeFade
    let color: Color = Item.rarityColors()[item.rarity].color;

    p5.noStroke();
    p5.fill(...(option?.disabled ? new Color(86, 101, 115).value : color.value), opacity <= 0 ? 0 : opacity);
    p5.rect(
        cumulativeMarginX,
        cumulativeMarginY,
        itemSideSize,
        itemSideSize,
        canvas.radius * 2
    );

    p5.textAlign(p5.CENTER, p5.CENTER);
    p5.textSize(20);
    let name: string = insertLineBreaks(item.name, p5.map(itemSideSize - canvas.margin, 0, p5.textWidth(item.name), 0, item.name.length));
    let textMargin: number = cumulativeMarginY + (itemSideSize / 2);

    p5.fill(255, 255, 255, 255 + relativeFade);
    p5.stroke(0, 0, 0, 255 + relativeFade);
    p5.strokeWeight(3);
    p5.text(
        name,
        cumulativeMarginX + (itemSideSize / 2),
        textMargin - canvas.margin
    );

    p5.textSize(16);
    let description: string = insertLineBreaks(item.description, p5.map(itemSideSize - canvas.margin, 0, p5.textWidth(item.description), 0, item.description.length));
    let subOffset: number = (countOcurrences(name, '\n') + Math.max(1, countOcurrences(description, '\n') - 1)) * canvas.margin;

    p5.fill(200, 200, 200, 255 + relativeFade);
    p5.strokeWeight(2);
    p5.text(
        description,
        cumulativeMarginX + (itemSideSize / 2),
        textMargin + subOffset
    );

    p5.textAlign(p5.LEFT, p5.TOP);
    p5.fill(255, 255, 255, 255 + relativeFade);
    p5.stroke(0, 0, 0, 255 + relativeFade);
    p5.strokeWeight(3);
    p5.textSize(16);
    p5.text(
        item.rarity,
        cumulativeMarginX + canvas.padding,
        cumulativeMarginY + canvas.padding
    );

    if (item.unique || item.isActive) {
        p5.textAlign(p5.RIGHT, p5.TOP);
        p5.fill([...(item.unique ? Color.YELLOW : Color.ORANGE).value, 255 + relativeFade]);
        p5.stroke(0, 0, 0, 255 + relativeFade);
        p5.strokeWeight(3);
        p5.textSize(16);
        p5.text(
            item.unique ? 'Unique' : 'Single Use',
            cumulativeMarginX + itemSideSize - canvas.padding,
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
        p5.fill(...(canAfford ? Color.YELLOW : Color.RED).value, 255 + relativeFade);
        p5.strokeWeight(2);
        p5.textSize(20);
        p5.text(
            `$ ${Math.floor(item.price)}`,
            cumulativeMarginX + (itemSideSize / 2),
            cumulativeMarginY + itemSideSize - canvas.padding
        );

    }
}