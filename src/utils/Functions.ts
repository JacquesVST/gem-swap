import { Position } from "../models/Position";
import * as p5 from "p5";

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

export function polygon(x: number, y: number, radius: number, npoints: number, p5: p5): void {
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