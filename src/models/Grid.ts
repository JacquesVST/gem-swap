import * as P5 from "p5";
import { canReach, checkPositionInLimit, hasConsecutive, polygon, stripesWithBorderRadius } from "../utils/Functions";
import { CanvasInfo } from "./CanvasInfo";
import { Cell } from "./Cell";
import { Color } from "./Color";
import { Effect } from "./Effect";
import { Item } from "./Item";
import { Position } from "./Position";
import { Run } from "./Run";

export class Grid {
    width: number;
    height: number;
    cells: Cell[][];
    totalHeight: number;
    selectedCellPos: Position;

    verticalCenterPadding: number = 0;
    horizontalCenterPadding: number = 0;
    sideSize: number = 0;
    isUnstable: boolean = false

    critical: number = 1;

    constructor(width: number, height: number, canvas: CanvasInfo) {
        this.width = width;
        this.height = height;

        this.generateEmptyCells();
        this.calculateSpacing(canvas);
    }

    get isEmpty(): boolean {
        return [...this.cells.flat()].every(cell => cell.item === undefined);
    }

    get isFull(): boolean {
        return [...this.cells.flat()].every((cell: Cell) => cell.item);
    }

    applyCriticalInBoard(): void {
        let criticalsLeft = this.critical > this.width * this.height ? this.width * this.height : this.critical;
        let chosenCriticals: Position[] = []
        do {

            let randomPosition: Position = new Position(Math.floor(Math.random() * this.width), Math.floor(Math.random() * this.height))

            if (!chosenCriticals.map((position: Position) => position.checksum).includes(randomPosition.checksum)) {
                chosenCriticals.push(randomPosition);
                criticalsLeft--;
            }

        } while (criticalsLeft > 0);

        let chosenCriticalsCheck: String[] = chosenCriticals.map((position: Position) => position.checksum);

        this.iterateXtoY((x: number, y: number) => {
            let item: Item = this.getItemByPosition(new Position(x, y));

            if (chosenCriticalsCheck.includes(item.position.checksum)) {
                item.critical = true
            } else {
                item.critical = false;
            }
        });
    }

    renew(run: Run) {
        this.generateEmptyCells();
        this.calculateSpacing(run.canvas);
        this.init(run);
    }

    generateEmptyCells(): void {
        this.isUnstable = false;
        this.cells = [...Array(this.width)].map(
            (_, x: number) => [...Array(this.height)].map(
                (_, y: number) => {
                    return new Cell(new Position(x, y));
                }
            )
        );
    }

    calculateSpacing(canvas: CanvasInfo): void {
        this.verticalCenterPadding = 0;
        this.verticalCenterPadding = 0;
        this.sideSize = 0;

        do {
            this.sideSize++;
            this.horizontalCenterPadding = canvas.playfield.x - (this.width * this.sideSize) - (this.width * canvas.padding) - canvas.padding;
            this.verticalCenterPadding = canvas.playfield.y - canvas.topUiSize - canvas.bottomUiSize - (this.height * this.sideSize) - (this.height * canvas.padding) - canvas.padding;
        } while (this.horizontalCenterPadding - this.width >= 0 && this.verticalCenterPadding - this.height >= 0);

        this.iterateXtoY((x: number, y: number) => {

            let currentXMargin = (this.horizontalCenterPadding / 2) + (x * this.sideSize) + (x * canvas.padding) + canvas.padding + canvas.margin;
            let currentYMargin = canvas.topUiSize + (this.verticalCenterPadding / 2) + (y * this.sideSize) + (y * canvas.padding) + canvas.padding + canvas.margin;

            this.cells[x][y].canvasPosition = new Position(currentXMargin, currentYMargin);
        });

        this.totalHeight = this.verticalCenterPadding + (this.height * (this.sideSize + canvas.padding)) + canvas.padding;
    }

    init(run: Run, callback?: () => void): void {
        this.generateItemsApplyGravityLoop(false, run, callback);
    }

    bootstrapStabilize(initialMatches: Item[][], run: Run, matchesCallback?: (matches: Item[][]) => void, moveCallback?: () => void) {
        this.isUnstable = true
        this.stabilizeAfterMove(initialMatches, run, matchesCallback, moveCallback);
    }

    stabilizeAfterMove(initialMatches: Item[][], run: Run, matchesCallback?: (matches: Item[][]) => void, moveCallback?: () => void): void {
        let matchesToRemove: Item[][] = initialMatches;
        if (matchesToRemove.length === 0 && moveCallback) {
            this.isUnstable = false
            moveCallback();
        }

        matchesToRemove.forEach((matchToRemove: Item[], matchIndex: number) => {
            matchToRemove.forEach((itemToRemove: Item, itemIndex: number) => {
                this.animateRemove(itemToRemove, run, () => {
                    this.removeItem(itemToRemove.position, () => {
                        run.inAnimation = false
                        if (itemIndex === matchToRemove.length - 1) {
                            this.generateItemsApplyGravityLoop(true, run, () => {
                                this.stabilizeAfterMove(this.findMatches(true), run, matchesCallback, moveCallback)
                            })

                            if (matchIndex === matchesToRemove.length - 1 && matchesCallback) {
                                matchesCallback(matchesToRemove);
                            }
                        }
                    });
                })
            })
        });

    }

    generateItemsApplyGravityLoop(allowMatches: boolean, run: Run, callback?: () => void): void {
        this.generateItems(run, allowMatches, () => {
            let positionsToApplyGravity: Position[] = this.findToApplyGravity();
            if (positionsToApplyGravity.length === 0 && callback) {
                callback();
            }
            positionsToApplyGravity.forEach((position: Position, index: number, array: Position[]) => {
                run.inAnimation = true
                let newPosition: Position = this.getNextAvailablePosition(position);
                this.animatePullItemDown(position, newPosition, () => {
                    this.pullItemDown(position, newPosition, () => {
                        if (index === array.length - 1) {
                            run.inAnimation = false
                            setTimeout(() => {
                                this.generateItemsApplyGravityLoop(allowMatches, run, callback)
                            }, 0);
                        }
                    })
                })
            })
        })
    }

    findMatches(validate?: boolean): Item[][] {
        let matches: Item[][] = [];

        this.iterateYtoX((x: number, y: number) => {
            let cell = this.getCellbyPosition(new Position(x, y));

            if (cell.item) {
                let item: Item = cell.item
                let horizontalMatch: Item[] = [item]

                // horizontal match
                let sameShape: boolean = true
                let increment: number = 1;
                while (sameShape && (increment + x) < this.width) {
                    let nextItem: Item = this.getNeighbourCell(cell, increment, 0).item
                    sameShape = nextItem && item.shape.sides === nextItem.shape.sides;
                    if (sameShape) {
                        horizontalMatch.push(nextItem);
                        increment++;
                    }
                }

                // vertical match
                sameShape = true
                increment = 1;
                let verticalMatch: Item[] = [item]
                while (sameShape && increment + y < this.height) {
                    let nextItem: Item = this.getNeighbourCell(cell, 0, increment).item
                    sameShape = nextItem && item.shape.sides === nextItem.shape.sides;
                    if (sameShape) {
                        verticalMatch.push(nextItem);
                        increment++;
                    }
                }

                let omniMatch: Item[] = [...(horizontalMatch.length > 2 ? horizontalMatch : []), ...(verticalMatch.length > 2 ? verticalMatch : [])]

                if (omniMatch.length) {
                    matches.push(omniMatch)
                }
            }
        });
        console.log([...matches])

        return validate ? this.sanitizeMatches(matches) : matches;
    }

    sanitizeMatches(matches: Item[][]): Item[][] {
        if (matches.length === 1) {
            return matches;
        }

        do {
            for (let i = 0; i < matches.length - 1; i++) {
                let match1: Item[] = matches[i];
                let match2: Item[] = matches[i + 1];

                if (this.mergeMatches(match1, match2).length !== match1.concat(match2).length) {
                    matches.splice(i, 2)
                    matches.push(this.mergeMatches(match1, match2));
                }
            }
        } while (!matches.flat().map((item: Item) => item.id).every((value: string, index: number, array: string[]) => array.indexOf(value) === array.lastIndexOf(value)))

        return matches;
    }

    mergeMatches(match1: Item[], match2: Item[]): Item[] {
        return Array.from(new Set(match1.concat(match2)));
    }

    animateRemove(item: Item, run: Run, callback?: () => void) {
        if (item) {
            run.sounds['match'].play();
            run.inAnimation = true;
            item.animationEndCallback = callback
            item.setupNewAnimation(10, new Position(0, 0), 255);
        } else {
            if (callback) {
                callback()
            }
        }
    }

    removeItem(position: Position, callback?: () => void): void {
        let item = this.getItemByPosition(position);
        let effect: Effect = item.effect;
        let removedItem: Item = { ...item } as Item;
        this.setCellItem(position, undefined)

        if (effect) {
            effect.effect(removedItem);
        }

        if (callback) {
            callback();
        }
    }

    findToApplyGravity(): Position[] {
        let positions: Position[] = [];
        let canBringRowDown = false

        for (let y = this.height - 1; y >= 0; y--) {
            for (let x = 0; x < this.width; x++) {
                if (y < this.height - 1 && this.cells[x][y].item && !this.cells[x][y + 1].item) {
                    positions.push(this.cells[x][y].position);
                    canBringRowDown = true;
                }
            }
            if (canBringRowDown) {
                break
            }
        }

        return positions;
    }

    getNextAvailablePosition(position: Position): Position {
        let newPosition: Position = position
        for (let y: number = position.y + 1; y < this.height; y++) {
            newPosition = newPosition.addY(1)
            let cell: Cell = this.getCellbyPosition(newPosition)
            if (cell?.item) {
                newPosition = newPosition.addY(-1)
                break
            }
        }
        return newPosition;
    }

    generateItems(run: Run, allowMatches: boolean = true, callback?: () => void): void {
        if (allowMatches) {
            for (let x = 0; x < this.width; x++) {
                let position: Position = new Position(x, 0)
                if (this.getItemByPosition(position) === undefined) {
                    this.setCellItem(position, Item.generateRandomItem(position, this.sideSize, run));
                }
            }
        } else {
            let row: Item[];
            let isHorizontalValid: boolean;

            do {
                isHorizontalValid = true;
                row = [];

                for (let x = 0; x < this.width; x++) {
                    let position: Position = new Position(x, 0)
                    if (this.getItemByPosition(position) === undefined) {

                        let generatedItem: Item;
                        let isVerticalValid: boolean;

                        do {
                            isVerticalValid = true;
                            generatedItem = Item.generateRandomItem(this.cells[x][0].position, this.sideSize, run);

                            let lowerMostPosition: Position = this.getNextAvailablePosition(generatedItem.position);
                            let nextCell: Cell = this.getCellbyPosition(lowerMostPosition.addY(1));
                            if (nextCell?.item?.shape?.id === generatedItem.shape.id) {
                                nextCell = this.getCellbyPosition(nextCell.position.addY(1));
                                if (nextCell?.item?.shape?.id === generatedItem.shape.id) {
                                    isVerticalValid = false
                                }
                            }

                        } while (!isVerticalValid);

                        row.push(generatedItem);
                    }
                }

                let rowShapeIds: string[] = row.map((item: Item) => item.shape.id);
                isHorizontalValid = !hasConsecutive(rowShapeIds, 3)

            } while (!isHorizontalValid);

            row.forEach((item: Item) => {
                this.setCellItem(item.position, item);
            })

        }

        if (callback) {
            callback();
        }
    }

    validateSwap(position1: Position, position2: Position, invalid: () => void, valid: () => void): boolean {
        if (position1.checksum === position2.checksum) {
            if (invalid) {
                invalid();
                return false;
            }
        }

        if (!canReach(position1, position2)) {
            if (invalid) {
                invalid();
                return false;
            }
        }

        let item1: Item | undefined = this.getItemByPosition(position1)?.renewPosition(position2);
        let item2: Item | undefined = this.getItemByPosition(position2)?.renewPosition(position1);

        if (item1 && item2 && item1.shape.id === item2.shape.id) {
            if (invalid) {
                invalid();
                return;
            }
        }

        if (valid) {
            valid();
        }

        return true;
    }

    getAnimateSwapData(position1: Position, position2: Position): AnimateSwapData {
        let cell1: Cell = this.getCellbyPosition(position1)
        let cell2: Cell = this.getCellbyPosition(position2)
        let item1: Item | undefined = this.getItemByPosition(position1);
        let item2: Item | undefined = this.getItemByPosition(position2);
        return { item1, item2, cell1, cell2, frames: 10 }
    }

    animateSwap(animateSwapData: AnimateSwapData, run: Run, callback: () => void): void {
        run.inAnimation = true
        let { item1, item2, cell1, cell2, frames } = animateSwapData;

        if (item1) {
            item1.animationEndCallback = () => setTimeout(callback, 0);
            item1.setupNewAnimation(frames, cell2.canvasPosition.difference(cell1.canvasPosition))
        }

        if (item2) {
            item2.setupNewAnimation(frames, cell2.canvasPosition.minus(cell1.canvasPosition))
        }

    }

    swap(swapData: SwapData, callback: () => void): void {

        this.setCellItem(swapData.position1, swapData.item2);
        this.setCellItem(swapData.position2, swapData.item1);

        if (callback) {
            callback();
        }
    }

    animatePullItemDown(position: Position, newPosition: Position, callback: () => void): void {
        let item: Item = this.getItemByPosition(position).renewPosition(newPosition);
        let relativeEndPosition = this.getCellbyPosition(newPosition).canvasPosition.difference(this.getCellbyPosition(position).canvasPosition);

        let distance = (newPosition.y - position.y) * 0.3

        item.animationEndCallback = callback;
        item.setupNewAnimation(10 * distance, relativeEndPosition);
    }

    pullItemDown(position: Position, newPosition: Position, callback: () => void): void {

        let item: Item = this.getItemByPosition(position);

        this.setCellItem(newPosition, item);
        this.setCellItem(position, undefined);

        if (callback) {
            callback();
        }
    }

    iterateXtoY(callback: (x: number, y: number) => void, breakX?: (x: number) => boolean, breakY?: (x: number, y: number) => boolean): void {
        for (let x = 0; x < this.width; x++) {
            if (breakX && breakX(x)) {
                break;
            }
            for (let y = 0; y < this.height; y++) {
                if (breakY && breakY(x, y)) {
                    break;
                }
                callback(x, y);
            }
        }
    }

    iterateYtoX(callback: (x: number, y: number) => void, breakY?: (y: number) => boolean, breakX?: (x: number, y: number) => boolean): void {
        for (let y = 0; y < this.height; y++) {
            if (breakY && breakY(y)) {
                break;
            }
            for (let x = 0; x < this.width; x++) {
                if (breakX && breakX(x, y)) {
                    break;
                }
                callback(x, y);
            }
        }
    }

    draw(canvas: CanvasInfo, p5: P5, hasDialogOpen: boolean = false): void {
        this.cells.flat().forEach((cell: Cell) => {
            p5.noStroke();
            let limits: number[] = [
                cell.canvasPosition.x,
                cell.canvasPosition.x + this.sideSize,
                cell.canvasPosition.y,
                cell.canvasPosition.y + this.sideSize,
            ];

            let critical: boolean = this.getItemByPosition(cell.position)?.critical;

            let color1: Color = critical ? new Color(203, 67, 53) : new Color(136, 78, 160);
            let color2: Color = critical ? new Color( 236, 112, 99) : new Color(175, 122, 197);

            let highlight: boolean = (!hasDialogOpen && checkPositionInLimit(new Position(p5.mouseX, p5.mouseY), ...limits)) || (this.selectedCellPos ? cell.position.checksum === this.selectedCellPos.checksum : false);

            if (cell?.item?.effect) {
                if (['Vertical AOE', 'Horizontal AOE'].includes(cell.item.effect.id)) {
                    stripesWithBorderRadius(
                        cell.canvasPosition,
                        new Position(this.sideSize, this.sideSize),
                        canvas.radius,
                        6,
                        cell.item.effect.id === 'Horizontal AOE',
                        color1,
                        color2,
                        highlight ? 200 : 255,
                        p5
                    )
                }
            } else {
                p5.fill([...color1.value, highlight ? 200 : 255])
                p5.rect(
                    cell.canvasPosition.x,
                    cell.canvasPosition.y,
                    this.sideSize,
                    this.sideSize,
                    canvas.radius
                );

            }
        });
    }

    drawItems(p5: P5): void {
        this.cells.flat().map((cell: Cell) => cell.item).forEach((item: Item) => {
            if (item) {
                let cellRef: Cell = this.getCellbyPosition(item.position);
                p5.strokeWeight(2);
                p5.stroke(0, 0, 0, 255 - item.additiveFade);
                p5.fill(item.shape.color.r, item.shape.color.g, item.shape.color.b, 255 - item.additiveFade);
                polygon(
                    cellRef.canvasPosition.x + (this.sideSize / 2) + item.relativeEndPosition.x,
                    cellRef.canvasPosition.y + (this.sideSize / 2) + item.relativeEndPosition.y,
                    item.sideSize,
                    item.shape.sides,
                    p5
                );
                item.updatePosition();

                if (item.critical) {
                    p5.textAlign(p5.CENTER, p5.CENTER)
                    p5.text
                    p5.text(
                        '!',
                        cellRef.canvasPosition.x + (this.sideSize / 2) + item.relativeEndPosition.x,
                        cellRef.canvasPosition.y + (this.sideSize / 2) + item.relativeEndPosition.y,
                    )
                }
            }
        });
    }

    getCellbyPosition(position: Position): Cell | undefined {
        if (
            position.x >= 0 &&
            position.x < this.width &&
            position.y >= 0 &&
            position.y < this.height
        ) {
            return this.cells[position.x][position.y];
        }
        return undefined
    }

    setCellItem(position: Position, item: Item | undefined): void {
        this.cells[position.x][position.y].item = item;
    }

    getItemByPosition(position: Position): Item | undefined {
        if (
            position.x >= 0 &&
            position.x < this.width &&
            position.y >= 0 &&
            position.y < this.height
        ) {
            return this.cells[position.x][position.y].item;
        }
        return undefined
    }

    getNeighbourCell(cell: Cell, xOffset: number = 0, yOffset: number = 0): Cell {
        let absoluteX: number = cell.position.x + xOffset;
        let absoluteY: number = cell.position.y + yOffset;

        if (absoluteX >= 0 && absoluteX < this.width && absoluteY >= 0 && absoluteY < this.height) {
            return this.cells[absoluteX][absoluteY];
        }

        return undefined;
    }

    mouseClickedGrid(position: Position, run: Run): void {
        if (this.isFull) {
            let clickFound: boolean = false;
            run.grid.iterateXtoY((x: number, y: number) => {
                let cell: Cell = run.grid.cells[x][y];

                let limits: number[] = [
                    cell.canvasPosition.x,
                    cell.canvasPosition.x + run.grid.sideSize,
                    cell.canvasPosition.y,
                    cell.canvasPosition.y + run.grid.sideSize
                ]

                if (checkPositionInLimit(position, ...limits)) {
                    clickFound = true

                    if (!run.grid.selectedCellPos) {
                        run.stackCombo = false
                        run.sounds['select'].play();
                        run.grid.selectedCellPos = cell.position

                        run.updateCombo([]);
                        run.updateDamage(0);
                    } else {
                        run.stackCombo = true
                        this.playerSwap(run, cell.position, run.grid.selectedCellPos);
                        run.grid.selectedCellPos = undefined
                        position = new Position(0, 0)
                    }
                }
            }, () => clickFound);
        } else {
            run.sounds['noMove'].play();
        }
    }

    playerSwap(run: Run, position1: Position, position2: Position): void {
        let swapValid: boolean = this.validateSwap(position1, position2, () => {
            run.sounds['noMove'].play();
        }, () => {
            run.sounds['move'].play();
        });

        if (swapValid) {
            let animateSwapData: AnimateSwapData = this.getAnimateSwapData(position1, position2);
            this.animateSwap(animateSwapData, run, () => {
                let swapData: SwapData = {
                    item1: animateSwapData.item1,
                    item2: animateSwapData.item2,
                    position1,
                    position2
                };

                this.swap(swapData, () => {
                    run.inAnimation = false
                    this.bootstrapStabilize(this.findMatches(true), run, (matches: Item[][]) => {
                        run.processMacthList(matches)
                    }, () => {
                        this.applyCriticalInBoard();
                        run.updatePlayerMoves();
                    })
                })
            })
        }
    }
    /*
    clearBoard(run: Run): void {
        let iterations: number = 50;
        let intervalWithCallback = (duration: number, callback: () => void) => {
            let count: number = 0;
            let interval = setInterval(() => {
                if (!this.isFull) {
                    this.applyGravity((pos1: Position, pos2: Position) => {
                        this.validateSwap(pos1, pos2, undefined, false, undefined, undefined)();
                    });
                    this.generateItems(run);
                } else {
                    let matches: Item[][] = run.grid.findMatches()
                    if (matches.length) {
                        run.grid.removeMatches(matches, run, false);
                    }
                }
                count++
                if (count === duration) {
                    clearInterval(interval)
                    callback();
                }
            }, 1);
        }

        intervalWithCallback(iterations, () => {
            
        })
    }
*/
}

export interface AnimateSwapData {
    item1: Item;
    item2: Item;
    cell1: Cell;
    cell2: Cell;
    frames: number;
}

export interface SwapData {
    item1: Item;
    item2: Item;
    position1: Position;
    position2: Position;
}
