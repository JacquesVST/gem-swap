import * as P5 from "p5";
import { Color } from "../models/Color";
import { Position } from "../models/Position";

export function generateId(): string {
    return "id" + Math.random().toString(16).slice(2)
}

export function canReach(pos1: Position, pos2: Position): boolean {
    if (pos1.x === pos2.x) {
        return [pos1.y - 1, pos1.y + 1].includes(pos2.y);
    } else if (pos1.y === pos2.y) {
        return [pos1.x - 1, pos1.x + 1].includes(pos2.x);
    }
    return false
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

export function checkPositionInLimit(position: Position, ...coords: number[]): boolean {
    return position.x > coords[0] && position.x < coords[1] && position.y > coords[2] && position.y < coords[3];
}

export function formatNumber(number: number): string {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}