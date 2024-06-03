import * as P5 from "p5";
import { Canvas } from "../controllers/Canvas";
import { Frequency } from "../interfaces";
import { Color } from "../models/Color";
import { ItemDialogOption } from "../models/Dialog";
import { Item } from "../models/Item";
import { Limits } from "../models/Limits";
import { Position } from "../models/Position";
import { Run } from "../models/Run";
import { countOcurrences, insertLineBreaks } from "./General";

export function drawItem(item: Item, margin: Position, sideSize: Position, relativeFade: number = 0, run?: Run, option?: ItemDialogOption, hideDescription?: boolean) {
    const canvas: Canvas = Canvas.getInstance();
    const p5: P5 = canvas.p5

    const color: Color = Item.rarityColors[item.rarity].color;
    const limits: Limits = drawClickableBox(
        margin,
        sideSize,
        (option?.disabled ? Color.DISABLED : color).alpha(255 + relativeFade)
    );

    if (option) {
        option.limits = limits;
    }

    p5.textAlign(p5.CENTER, p5.CENTER);
    p5.textSize(canvas.uiData.fontText);
    let name: string = insertLineBreaks(item.name, p5.map(sideSize.x - canvas.margin, 0, p5.textWidth(item.name), 0, item.name.length));
    let textMargin: number = margin.y + (sideSize.y / 2);

    p5.fill(Color.WHITE.alpha(255 + relativeFade).value);
    p5.stroke(Color.BLACK.alpha(255 + relativeFade).value);
    p5.strokeWeight(canvas.stroke);
    p5.text(
        name,
        margin.x + (sideSize.x / 2),
        textMargin - canvas.margin * (hideDescription ? 0 : 1)
    );

    if (!hideDescription) {

        p5.textSize(canvas.uiData.fontDetail);
        let description: string = insertLineBreaks(item.description, p5.map(sideSize.x - canvas.margin, 0, p5.textWidth(item.description), 0, item.description.length));
        let subOffset: number = (countOcurrences(name, '\n') + Math.max(1, countOcurrences(description, '\n') - 1)) * canvas.margin;

        fillStroke(Color.WHITE_1, 255 + relativeFade)
        p5.text(
            description,
            margin.x + (sideSize.x / 2),
            textMargin + subOffset
        );
    }

    fillStroke(color, 255 + relativeFade);
    p5.textAlign(p5.LEFT, p5.TOP);
    p5.textSize(canvas.uiData.fontDetail);
    p5.text(
        item.rarity,
        margin.x + canvas.padding,
        margin.y + canvas.padding
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


        fillStroke(item.unique ? Color.YELLOW : Color.ORANGE, 255 + relativeFade);
        p5.textAlign(p5.RIGHT, p5.TOP);
        p5.textSize(canvas.uiData.fontDetail);
        p5.text(
            item.unique ? 'Unique' : frequency,
            margin.x + sideSize.x - canvas.padding,
            margin.y + canvas.padding
        );
    }

    if (item.price) {
        let canAfford: boolean = true;
        if (run?.player && option) {
            canAfford = run?.player.gold >= item.price;
            option.disabled = !canAfford;
        }

        fillStroke(canAfford ? Color.YELLOW : Color.RED, 255 + relativeFade);
        p5.textAlign(p5.CENTER, p5.BOTTOM);
        p5.textSize(canvas.uiData.fontSubText);
        p5.text(
            `$ ${Math.floor(item.price)}`,
            margin.x + (sideSize.x / 2),
            margin.y + sideSize.y - canvas.padding
        );

    }
}

export function drawClickableBox(position: Position, size: Position, background: Color, content?: () => void): Limits {
    const canvas: Canvas = Canvas.getInstance();
    const p5: P5 = canvas.p5;

    const limits: Limits = position.toLimits(size);
    background = background.alpha(limits.contains(canvas.mousePosition) ? background.a : p5.max(background.a - 55, 0));

    const drawingContext: CanvasRenderingContext2D = p5.drawingContext as CanvasRenderingContext2D;

    startShadow(drawingContext);

    fillFlat(background)
    p5.rect(
        position.x,
        position.y,
        size.x,
        size.y,
        canvas.radius * 2
    );

    endShadow(drawingContext);

    if (content) {
        content();
    }

    return limits;
}

export function startShadow(drawingContext: CanvasRenderingContext2D): void {
    drawingContext.shadowOffsetX = 5;
    drawingContext.shadowOffsetY = 5;
    drawingContext.shadowBlur = 10;
    drawingContext.shadowColor = 'rgba(0, 0, 0, 0.5)';
}

export function endShadow(drawingContext: CanvasRenderingContext2D): void {
    drawingContext.shadowOffsetX = 0;
    drawingContext.shadowOffsetY = 0;
    drawingContext.shadowBlur = 0;
    drawingContext.shadowColor = 'rgba(0, 0, 0, 0)';
}

export function fillFlat(color: Color = Color.GRAY_3): void {
    const canvas: Canvas = Canvas.getInstance();

    canvas.p5.noStroke();
    canvas.p5.fill(color.value)
}

export function fillStroke(color: Color = Color.WHITE, opacity?: number): void {
    const canvas: Canvas = Canvas.getInstance();

    opacity = !isNaN(opacity) ? opacity : color.a;

    canvas.p5.strokeWeight(canvas.stroke);
    canvas.p5.stroke(Color.BLACK.alpha(opacity).value);
    canvas.p5.fill(color.alpha(opacity).value);
}

export function rectWithStripes(drawingPos: Position, drawingSize: Position, stripeCount: number, isHorizontal: boolean, color1: Color, color2: Color, opacity: number = 255): void {
    const canvas: Canvas = Canvas.getInstance();

    if (isHorizontal) {
        let stripeSize: number = drawingSize.y / stripeCount;
        for (let i = 0; i < stripeCount; i++) {
            let color: Color = color1;
            if (i % 2 === 1) {
                color = color2;
            }

            let allRadius: number[] = [0, 0, 0, 0];
            if (i === 0) {
                allRadius = [canvas.radius, canvas.radius, 0, 0];
            }

            if (i === stripeCount - 1) {
                allRadius = [0, 0, canvas.radius, canvas.radius];
            }

            fillFlat(color.alpha(opacity))
            canvas.p5.rect(
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
                allRadius = [canvas.radius, 0, 0, canvas.radius];
            }

            if (i === stripeCount - 1) {
                allRadius = [0, canvas.radius, canvas.radius, 0];
            }

            fillFlat(color.alpha(opacity))
            canvas.p5.rect(
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
