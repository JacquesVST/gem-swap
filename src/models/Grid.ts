import * as P5 from "p5";
import { canReach, checkPositionInLimit, hasConsecutive, polygon, stripesWithBorderRadius } from "../utils/Functions";
import { CanvasInfo } from "./CanvasInfo";
import { Cell } from "./Cell";
import { Color } from "./Color";
import { EffectParams } from "./Effect";
import { EventEmitter } from "./EventEmitter";
import { Piece } from "./Piece";
import { FallPieceAnimationParams, RemovePieceAnimationData, RemovePieceAnimationParams, SwapPieceAnimationParams } from "./PieceAnimation";
import { Position } from "./Position";
import { Run } from "./Run";
import { Stage } from "./Stage";

export class Grid extends EventEmitter {
    width: number;
    height: number;
    canvas: CanvasInfo;
    cells: Cell[][];
    selectedCellPosition: Position;
    runSnapshot: Run;
    stage: Stage;

    verticalCenterPadding: number = 0;
    horizontalCenterPadding: number = 0;
    sideSize: number = 0;
    isUnstable: boolean = false;

    constructor(width: number, height: number, stage: Stage) {
        super();
        this.width = width;
        this.height = height;
        this.stage = stage;
        this.canvas = CanvasInfo.getInstance();

        this.generateEmptyCells();
        this.calculateSpacing();
    }

    get isFull(): boolean {
        return [...this.cells.flat()].every((cell: Cell) => cell.piece);
    }

    stabilizeGrid(useCase: string, allowMatches: boolean): void {
        this.generatePieces(allowMatches);
        let positionsToApplyGravity: Position[] = this.findToApplyGravity();

        if (positionsToApplyGravity.length === 0) {
            this.emit('GridStabilized:' + useCase);
        }

        positionsToApplyGravity.forEach((position: Position, index: number) => {
            let piece: Piece = this.getPieceByPosition(position);
            let newPosition: Position = this.getNextAvailablePosition(position);
            let relativeEndPosition = this.getCellbyPosition(newPosition).canvasPosition.difference(this.getCellbyPosition(position).canvasPosition);

            let distance: number = (newPosition.y - position.y) * 0.3;

            let params: FallPieceAnimationParams = new FallPieceAnimationParams(useCase,
                {
                    callNextAction: index === positionsToApplyGravity.length - 1,
                    position,
                    newPosition,
                    allowMatches: allowMatches,
                }
            );

            piece.renewPosition(newPosition);
            piece.setupFallAnimation(10 * distance, relativeEndPosition, params);
        });
    }

    findToApplyGravity(): Position[] {
        let positions: Position[] = [];
        let canBringRowDown = false;

        for (let y = this.height - 1; y >= 0; y--) {
            for (let x = 0; x < this.width; x++) {
                if (y < this.height - 1 && this.cells[x][y].piece && !this.cells[x][y + 1].piece) {
                    positions.push(this.cells[x][y].position);
                    canBringRowDown = true;
                }
            }
            if (canBringRowDown) {
                break;
            }
        }

        return positions;
    }

    getNextAvailablePosition(position: Position): Position {
        let newPosition: Position = position;
        for (let y: number = position.y + 1; y < this.height; y++) {
            newPosition = newPosition.addY(1)
            let cell: Cell = this.getCellbyPosition(newPosition);
            if (cell?.piece) {
                newPosition = newPosition.addY(-1);
                break;
            }
        }
        return newPosition;
    }

    animatePullPieceDown(position: Position, newPosition: Position, eventParams: FallPieceAnimationParams): void {
        let piece: Piece = this.getPieceByPosition(position);
        let relativeEndPosition = this.getCellbyPosition(newPosition).canvasPosition.difference(this.getCellbyPosition(position).canvasPosition);

        let distance = (newPosition.y - position.y) * 0.3;

        setTimeout(() => {
            piece.renewPosition(newPosition);
            piece.setupFallAnimation(10 * distance, relativeEndPosition, eventParams);
        }, 1 * 15);
    }

    applyCriticalInGrid(amount: number): void {
        if (!this.isFull) {
            return;
        }

        let criticalsLeft: number = amount > this.width * this.height ? this.width * this.height : amount;
        let chosenCriticals: Position[] = [];

        do {
            let randomPosition: Position = new Position(Math.floor(Math.random() * this.width), Math.floor(Math.random() * this.height));

            if (!chosenCriticals.map((position: Position) => position.checksum).includes(randomPosition.checksum)) {
                chosenCriticals.push(randomPosition);
                criticalsLeft--;
            }

        } while (criticalsLeft > 0);

        let chosenCriticalsCheck: String[] = chosenCriticals.map((position: Position) => position.checksum);

        this.iterateXtoY((position: Position) => {
            let piece: Piece = this.getPieceByPosition(position);

            if (chosenCriticalsCheck.includes(piece?.position?.checksum)) {
                piece.critical = true;
            } else {
                piece.critical = false;
            }
        });

        this.isUnstable = false;
    }

    init(run: Run): void {
        this.generateEmptyCells();
        this.calculateSpacing();
        this.setRunSnapshot(run);
        this.stabilizeGrid('Init', false);
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

    calculateSpacing(): void {
        this.verticalCenterPadding = 0;
        this.verticalCenterPadding = 0;
        this.sideSize = 0;

        do {
            this.sideSize++;
            this.horizontalCenterPadding = this.canvas.playfield.x - (this.width * this.sideSize) - (this.width * this.canvas.padding) - this.canvas.padding;
            this.verticalCenterPadding = this.canvas.playfield.y - this.canvas.topUiSize - this.canvas.bottomUiSize - (this.height * this.sideSize) - (this.height * this.canvas.padding) - this.canvas.padding;
        } while (this.horizontalCenterPadding - this.width >= 0 && this.verticalCenterPadding - this.height >= 0);

        this.iterateXtoY((position: Position) => {

            let currentXMargin = (this.horizontalCenterPadding / 2) + (position.x * this.sideSize) + (position.x * this.canvas.padding) + this.canvas.padding + this.canvas.margin;
            let currentYMargin = this.canvas.topUiSize + (this.verticalCenterPadding / 2) + (position.y * this.sideSize) + (position.y * this.canvas.padding) + this.canvas.padding + this.canvas.margin;

            this.getCellbyPosition(position).canvasPosition = new Position(currentXMargin, currentYMargin);
        });

        this.canvas.cellSideSize = this.sideSize;
        this.canvas.totalGridHeight = this.verticalCenterPadding + (this.height * (this.sideSize + this.canvas.padding)) + this.canvas.padding;
    }

    setRunSnapshot(run: Run): void {
        this.runSnapshot = {
            possibleEffects: run.possibleEffects,
            possibleShapes: run.possibleShapes
        } as Run;
    }

    reapplyPositionsToPieces(): void {
        this.cells.forEach((cells: Cell[], x: number) => {
            cells.forEach((cell: Cell, y: number) => {
                cell.position = new Position(x, y);
                cell.piece?.renewPosition(cell.position);
                this.calculateSpacing();
            })
        })
    }

    findMatches(useCase: string, validate?: boolean): void {
        let matches: Piece[][] = [];

        this.iterateYtoX((position: Position) => {
            let cell = this.getCellbyPosition(position);

            if (cell.piece) {
                let piece: Piece = cell.piece;
                let horizontalMatch: Piece[] = [piece];

                // horizontal match
                let sameShape: boolean = true;
                let increment: number = 1;
                while (sameShape && (increment + position.x) < this.width) {
                    let nextPiece: Piece = this.getNeighbourCell(cell, increment, 0).piece;
                    sameShape = nextPiece && piece.shape.id === nextPiece.shape.id;
                    if (sameShape) {
                        horizontalMatch.push(nextPiece);
                        increment++;
                    }
                }

                // vertical match
                sameShape = true;
                increment = 1;
                let verticalMatch: Piece[] = [piece];
                while (sameShape && increment + position.y < this.height) {
                    let nextPiece: Piece = this.getNeighbourCell(cell, 0, increment).piece;
                    sameShape = nextPiece && piece.shape.id === nextPiece.shape.id;
                    if (sameShape) {
                        verticalMatch.push(nextPiece);
                        increment++;
                    }
                }

                let omniMatch: Piece[] = [...(horizontalMatch.length > 2 ? horizontalMatch : []), ...(verticalMatch.length > 2 ? verticalMatch : [])];

                if (omniMatch.length) {
                    matches.push(omniMatch);
                }
            }
        });

        matches = validate ? this.sanitizeMatches(matches) : matches;
        this.emit('MatchesFound:' + useCase, matches);
    }

    sanitizeMatches(matches: Piece[][]): Piece[][] {
        if (matches.length <= 1) {
            return matches;
        }

        while (matches.reduce(this.mergeMatches).length !== matches.reduce(this.concatMatches).length) {

            rootLoop:
            for (let i: number = 0; i < matches.length - 1; i++) {
                let match1: Piece[] = matches[i];

                for (let j: number = i + 1; j < matches.length; j++) {
                    let match2: Piece[] = matches[j];

                    if (this.mergeMatches(match1, match2).length !== match1.concat(match2).length) {
                        matches = matches.filter((match: Piece[]) => {
                            let check: string = this.getMatchChecksum(match);
                            let m1: string = this.getMatchChecksum(match1);
                            let m2: string = this.getMatchChecksum(match2);
                            return check !== m1 && check !== m2;
                        })
                        matches.push(this.mergeMatches(match1, match2));

                        break rootLoop;
                    }
                }
            }
        }

        matches.forEach((match: Piece[]) => {
            match = match.sort((piece: Piece) => !!piece.effect ? -1 : 1);
        })

        return matches;
    }

    mergeMatches(match1: Piece[], match2: Piece[]): Piece[] {
        return Array.from(new Set(match1.concat(match2)));
    }

    concatMatches(match1: Piece[], match2: Piece[]): Piece[] {
        return match1.concat(match2);
    }

    getMatchChecksum(match: Piece[]): string {
        return match.map((piece: Piece) => piece.position.checksum).join('-');
    }

    generatePieces(allowMatches: boolean = true): boolean {
        let generated: boolean = false;
        if (allowMatches) {
            for (let x = 0; x < this.width; x++) {
                let position: Position = new Position(x, 0)
                if (this.getPieceByPosition(position) === undefined) {
                    generated = true;
                    this.setCellPiece(position, Piece.generateRandomPiece(position, this.sideSize, this.runSnapshot));
                }
            }
        } else {
            let row: Piece[];
            let isHorizontalValid: boolean;

            do {
                isHorizontalValid = true;
                row = [];

                for (let x = 0; x < this.width; x++) {
                    let position: Position = new Position(x, 0);
                    if (this.getPieceByPosition(position) === undefined) {

                        let generatedPiece: Piece;
                        let isVerticalValid: boolean;

                        do {
                            isVerticalValid = true;
                            generatedPiece = Piece.generateRandomPiece(this.cells[x][0].position, this.sideSize, this.runSnapshot);

                            let lowerMostPosition: Position = this.getNextAvailablePosition(generatedPiece.position);
                            let nextCell: Cell = this.getCellbyPosition(lowerMostPosition.addY(1));
                            if (nextCell?.piece?.shape?.id === generatedPiece.shape.id) {
                                nextCell = this.getCellbyPosition(nextCell.position.addY(1));
                                if (nextCell?.piece?.shape?.id === generatedPiece.shape.id) {
                                    isVerticalValid = false;
                                }
                            }

                        } while (!isVerticalValid);

                        row.push(generatedPiece);
                    }
                }

                let rowShapeIds: string[] = row.map((piece: Piece) => piece.shape.id);
                isHorizontalValid = !hasConsecutive(rowShapeIds, 3);

            } while (!isHorizontalValid);

            row.forEach((piece: Piece) => {
                generated = true;
                this.setCellPiece(piece.position, piece);
            })

        }

        return generated;
    }

    validateSwap(position1: Position, position2: Position): boolean {
        if (position1.checksum === position2.checksum) {
            return false;
        }

        if (!canReach(position1, position2)) {
            return false;
        }

        let piece1: Piece | undefined = this.getPieceByPosition(position1);
        let piece2: Piece | undefined = this.getPieceByPosition(position2);

        if (!piece1 || !piece2) {
            return false;
        }

        return true;
    }

    getSwapDataFromPositions(position1: Position, position2: Position): SwapData {
        let cell1: Cell = this.getCellbyPosition(position1);
        let cell2: Cell = this.getCellbyPosition(position2);
        let piece1: Piece | undefined = this.getPieceByPosition(position1)?.renewPosition(position2);
        let piece2: Piece | undefined = this.getPieceByPosition(position2)?.renewPosition(position1);
        return { piece1, piece2, cell1, cell2 };
    }

    swap(swapData: SwapData): void {
        this.setCellPiece(swapData.cell1.position, swapData.piece2);
        this.setCellPiece(swapData.cell2.position, swapData.piece1);

        this.emit('SwapDone');

        this.reapplyPositionsToPieces();
        setTimeout(() => {
            this.findMatches('Swap', true);
        }, 0)
    }

    pullPieceDown(params: FallPieceAnimationParams): void {
        this.setCellPiece(params.data.newPosition, this.getPieceByPosition(params.data.position).renewPosition(params.data.newPosition));
        this.setCellPiece(params.data.position, undefined);


        if (params.data.callNextAction) {
            this.stabilizeGrid(params.useCase, params.data.allowMatches);
        }
    }

    animateRemove(piece: Piece, params: RemovePieceAnimationParams): void {
        piece.setupRemoveAnimation(10, 255, params);
    }

    removePiece(useCase: string, data: RemovePieceAnimationData): void {
        this.setCellPiece(data.position, undefined);

        if (data.callNextAction) {
            this.emit('MatchesRemoved:' + useCase, data.matches, this.id);
        }
    }

    removeMatches(matches: Piece[][], useCase: string): void {
        if (matches.length) {
            let firstEffectMatch: Piece[] = this.findEffectMatchInMatches(matches);
            if (firstEffectMatch) {
                let firstEffectPiece: Piece = this.findEffectPieceInMatch(firstEffectMatch);
                this.resolveEffects(firstEffectPiece, firstEffectMatch, matches);
                return;
            }
        }

        matches.forEach((matchToRemove: Piece[], matchIndex: number) => {
            matchToRemove.forEach((pieceToRemove: Piece, pieceIndex: number) => {
                let params: RemovePieceAnimationParams = new RemovePieceAnimationParams(useCase, {
                    callNextAction: pieceIndex === matchToRemove.length - 1 && matchIndex === matches.length - 1,
                    position: pieceToRemove.position,
                    matches: matches
                });
                this.animateRemove(pieceToRemove, params);
            })
        });
    }

    findEffectMatchInMatches(matches: Piece[][]): Piece[] {
        return matches.find((match: Piece[]) => match.some((piece: Piece) => piece?.effect));
    }

    findEffectPieceInMatch(match: Piece[]): Piece {
        return match.find((piece: Piece) => piece?.effect);
    }

    resolveEffects(piece: Piece, match: Piece[], matches: Piece[][]): void {
        piece.effect.effect(new EffectParams(piece, match, matches));
    }

    eliminateShape(id: string): void {
        let match: Piece[] = [];
        this.iterateXtoY((position: Position) => {
            let piece: Piece = this.getPieceByPosition(position);
            if (piece?.shape?.id === id) {
                match.push(piece);
            }
        });
        this.removeMatches([match], 'Loop');
    }

    clearRow(params: EffectParams): void {
        let matchIndex: number = params.matches.findIndex((match: Piece[]) => this.getMatchChecksum(match) === this.getMatchChecksum(params.match));

        let newMatches: Piece[][] = params.matches;
        let newMatch: Piece[] = [];
        this.iterateXtoY((position: Position) => {
            if (position.y === params.piece.position.y) {
                newMatch.push(this.getPieceByPosition(position));
            }
        })

        newMatch = this.mergeMatches(newMatch, params.match);

        newMatch.forEach((piece: Piece) => {
            if (piece.position.checksum === params.piece.position.checksum) {
                piece.effect = undefined;
            }
        });

        newMatches[matchIndex] = newMatch;

        this.removeMatches(this.sanitizeMatches(newMatches), 'Loop');
    }

    clearColumn(params: EffectParams): void {
        let matchIndex: number = params.matches.findIndex((match: Piece[]) => this.getMatchChecksum(match) === this.getMatchChecksum(params.match));

        let newMatches: Piece[][] = params.matches;
        let newMatch: Piece[] = [];
        this.iterateXtoY((position: Position) => {
            if (position.x === params.piece.position.x) {
                newMatch.push(this.getPieceByPosition(position));
            }
        })

        newMatch = this.mergeMatches(newMatch, params.match);

        newMatch.forEach((piece: Piece) => {
            if (piece.position.checksum === params.piece.position.checksum) {
                piece.effect = undefined;
            }
        });

        newMatches[matchIndex] = newMatch;

        this.removeMatches(this.sanitizeMatches(newMatches), 'Loop');
    }

    clearGrid(useCase: string): void {
        this.emit('ClearingGrid:' + useCase);
        this.iterateXtoY((position: Position) => {
            let numericPosition: number = (position.x + 1) * (position.y + 1);
            setTimeout(() => {
                let params: RemovePieceAnimationParams = new RemovePieceAnimationParams(
                    useCase,
                    {
                        callNextAction: position.x === this.width - 1 && position.y === this.height - 1,
                        position: position,
                        matches: []
                    },
                );
                this.animateRemove(this.getPieceByPosition(position), params);
            }, numericPosition * 15);
        });
    }

    iterateXtoY(callback: (position: Position) => void, breakX?: (x: number) => boolean, breakY?: (x: number, y: number) => boolean): void {
        for (let x = 0; x < this.width; x++) {
            if (breakX && breakX(x)) {
                break;
            }
            for (let y = 0; y < this.height; y++) {
                if (breakY && breakY(x, y)) {
                    break;
                }
                callback(new Position(x, y));
            }
        }
    }

    iterateYtoX(callback: (position: Position) => void, breakY?: (y: number) => boolean, breakX?: (x: number, y: number) => boolean): void {
        for (let y = 0; y < this.height; y++) {
            if (breakY && breakY(y)) {
                break;
            }
            for (let x = 0; x < this.width; x++) {
                if (breakX && breakX(x, y)) {
                    break;
                }
                callback(new Position(x, y));
            }
        }
    }

    draw(hasDialogOpen: boolean = false): void {
        let p5: P5 = this.canvas.p5;
        this.cells.flat().forEach((cell: Cell) => {
            p5.noStroke();
            let limits: number[] = [
                cell.canvasPosition.x,
                cell.canvasPosition.x + this.sideSize,
                cell.canvasPosition.y,
                cell.canvasPosition.y + this.sideSize,
            ];

            let critical: boolean = this.getPieceByPosition(cell.position)?.critical;

            let color1: Color = critical ? new Color(203, 67, 53) : new Color(136, 78, 160);
            let color2: Color = critical ? new Color(236, 112, 99) : new Color(175, 122, 197);

            let highlight: boolean = (!hasDialogOpen && checkPositionInLimit(new Position(p5.mouseX, p5.mouseY), ...limits)) || (this.selectedCellPosition ? cell.position.checksum === this.selectedCellPosition.checksum : false);

            if (cell?.piece?.effect) {
                if (['Vertical AOE', 'Horizontal AOE'].includes(cell.piece.effect.id)) {
                    stripesWithBorderRadius(
                        cell.canvasPosition,
                        new Position(this.sideSize, this.sideSize),
                        this.canvas.radius,
                        6,
                        cell.piece.effect.id === 'Horizontal AOE',
                        color1,
                        color2,
                        highlight ? 200 : 255,
                        p5
                    );
                }
            } else {
                p5.fill([...color1.value, highlight ? 200 : 255]);
                p5.rect(
                    cell.canvasPosition.x,
                    cell.canvasPosition.y,
                    this.sideSize,
                    this.sideSize,
                    this.canvas.radius
                );

            }
        });
    }

    drawPieces(): void {
        let p5: P5 = this.canvas.p5;
        this.cells.flat().map((cell: Cell) => cell.piece).forEach((piece: Piece) => {
            if (piece) {
                let cellRef: Cell = this.getCellbyPosition(piece.position);
                p5.strokeWeight(2);
                p5.stroke(0, 0, 0, 255 - piece.additiveFade);
                p5.fill(piece.shape.color.r, piece.shape.color.g, piece.shape.color.b, 255 - piece.additiveFade);
                polygon(
                    cellRef.canvasPosition.x + (this.sideSize / 2) + piece.relativeEndPosition.x,
                    cellRef.canvasPosition.y + (this.sideSize / 2) + piece.relativeEndPosition.y,
                    piece.sideSize,
                    piece.shape.sides,
                    p5
                );
                piece.updatePosition();

                if (piece.critical) {
                    p5.textAlign(p5.CENTER, p5.CENTER);
                    p5.noStroke();
                    p5.fill(0);
                    p5.textSize(25);
                    p5.text(
                        '!',
                        cellRef.canvasPosition.x + (this.sideSize / 2) + piece.relativeEndPosition.x,
                        cellRef.canvasPosition.y + (this.sideSize / 2) + piece.relativeEndPosition.y,
                    );
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
        return undefined;
    }

    setCellPiece(position: Position, piece: Piece | undefined): void {
        this.cells[position.x][position.y].piece = piece;
    }

    getPieceByPosition(position: Position): Piece | undefined {
        if (
            position &&
            position.x >= 0 &&
            position.x < this.width &&
            position.y >= 0 &&
            position.y < this.height
        ) {
            return this.cells[position.x][position.y].piece;
        }
        return undefined;
    }

    getNeighbourCell(cell: Cell, xOffset: number = 0, yOffset: number = 0): Cell {
        let absoluteX: number = cell.position.x + xOffset;
        let absoluteY: number = cell.position.y + yOffset;

        if (absoluteX >= 0 && absoluteX < this.width && absoluteY >= 0 && absoluteY < this.height) {
            return this.cells[absoluteX][absoluteY];
        }

        return undefined;
    }

    playerSwap(position1: Position, position2: Position): void {
        let validatedSwap: boolean = this.validateSwap(position1, position2);
        this.emit('SwapValidated', validatedSwap);

        if (validatedSwap) {
            let swapData: SwapData = this.getSwapDataFromPositions(position1, position2);

            if (swapData.piece1) {
                swapData.piece1.setupSwapAnimation(10, swapData.cell2.canvasPosition.difference(swapData.cell1.canvasPosition), new SwapPieceAnimationParams({ callNextAction: true, swapData }));
            }

            if (swapData.piece2) {
                swapData.piece2.setupSwapAnimation(10, swapData.cell2.canvasPosition.minus(swapData.cell1.canvasPosition), new SwapPieceAnimationParams({ callNextAction: false }));
            }
        }
    }

}

export interface SwapData {
    piece1: Piece;
    piece2: Piece;
    cell1: Cell;
    cell2: Cell;
}
