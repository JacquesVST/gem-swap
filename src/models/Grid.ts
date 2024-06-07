import { Canvas } from "../controllers/Canvas";
import { EventEmitter } from "../controllers/EventEmitter";
import { IGrid, IPosition, ISwapData } from "../interfaces";
import { rectWithStripes } from "../utils/Draw";
import { hasConsecutive } from "../utils/General";
import { Cell } from "./Cell";
import { Color } from "./Color";
import { EffectParams } from "./Effect";
import { Item } from "./Item";
import { Limits } from "./Limits";
import { FallPieceAnimationParams, Piece, RemovePieceAnimationData, RemovePieceAnimationParams } from "./Piece";
import { Position } from "./Position";
import { Run } from "./Run";
import { Stage } from "./Stage";

export class Grid extends EventEmitter implements IGrid {
    width: number;
    height: number;
    sideSize: number;
    cells: Cell[][];
    selectedCellPosition: Position;
    runSnapshot: Run;

    isUnstable: boolean = false;

    constructor(width: number, height: number, stage: Stage) {
        super('Grid');
        this.width = width;
        this.height = height;

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

            const params: FallPieceAnimationParams = {
                baseAction: 'FallAnimationEnded',
                useCase,
                data: {
                    callNextAction: index === positionsToApplyGravity.length - 1,
                    position,
                    newPosition,
                    allowMatches: allowMatches
                }
            }

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
                    positions.push(this.cells[x][y].gridPosition);
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
            let randomPosition: Position = Position.of(Math.floor(Math.random() * this.width), Math.floor(Math.random() * this.height));

            if (!chosenCriticals.map((position: Position) => position.checksum).includes(randomPosition.checksum)) {
                chosenCriticals.push(randomPosition);
                criticalsLeft--;
            }

        } while (criticalsLeft > 0);

        let chosenCriticalsCheck: String[] = chosenCriticals.map((position: Position) => position.checksum);

        this.iterateXtoY((position: Position) => {
            let piece: Piece = this.getPieceByPosition(position);

            if (chosenCriticalsCheck.includes(piece?.gridPosition?.checksum)) {
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
                    return new Cell(Position.of(x, y));
                }
            )
        );
    }

    calculateSpacing(): void {
        const canvas: Canvas = Canvas.getInstance();

        let horizontalCenterPadding: number = 0;
        let verticalCenterPadding: number = 0;

        let marginLeft: number = 0;
        let marginRight: number = 0;
        let marginTop: number = 0;
        let marginBottom: number = 0;

        this.sideSize = 0;

        do {
            this.sideSize++;
            horizontalCenterPadding = canvas.playfield.x - (this.width * this.sideSize) - (this.width * canvas.padding) - canvas.padding;
            verticalCenterPadding = canvas.playfield.y - canvas.uiData.topUiSize - canvas.uiData.bottomUiSize - (this.height * this.sideSize) - (this.height * canvas.padding) - canvas.padding;

            horizontalCenterPadding -= (canvas.itemSideSize + canvas.margin) * 2

        } while (horizontalCenterPadding - this.width >= 0 && verticalCenterPadding - this.height >= 0);

        this.iterateXtoY((position: Position) => {

            let currentXMargin = (horizontalCenterPadding / 2) + (position.x * this.sideSize) + ((position.x + 1) * canvas.padding) + canvas.margin;
            let currentYMargin = canvas.uiData.topUiSize + (verticalCenterPadding / 2) + (position.y * this.sideSize) + ((position.y + 1) * canvas.padding) + canvas.margin;

            currentXMargin += canvas.itemSideSize + canvas.margin;

            if (position.checksum === 'X0Y0') {
                marginLeft = currentXMargin;
                marginTop = currentYMargin;
            }

            if (position.checksum === `X${this.width - 1}Y${this.height - 1}`) {
                marginRight = currentXMargin + this.sideSize;
                marginBottom = currentYMargin + this.sideSize;
            }

            this.getCellbyPosition(position).canvasPosition = Position.of(currentXMargin, currentYMargin);
        });

        Canvas.getInstance().gridData = {
            cellSideSize: this.sideSize,
            totalGridHeight: verticalCenterPadding + (this.height * (this.sideSize + canvas.padding)) + canvas.padding,
            horizontalCenterPadding,
            verticalCenterPadding,
            marginLeft,
            marginRight,
            marginTop,
            marginBottom
        };
    }

    setRunSnapshot(run: Run): void {
        this.runSnapshot = {
            possibleEffects: run.possibleEffects,
            possibleShapes: run.possibleShapes,
            player: run.player
        } as Run;
    }

    reapplyPositionsToPieces(): void {
        this.cells.forEach((cells: Cell[], x: number) => {
            cells.forEach((cell: Cell, y: number) => {
                cell.gridPosition = Position.of(x, y);
                cell.piece?.renewPosition(cell.gridPosition);
                this.calculateSpacing();
            })
        })
    }

    findMatches(useCase: string, validate?: boolean): void {
        let matches: Piece[][] = [];
        let has4x4: boolean = this.runSnapshot?.player?.passive?.name === '4x4';

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

                const minSize: number = has4x4 ? 3 : 2;

                let omniMatch: Piece[] = [...(horizontalMatch.length > minSize ? horizontalMatch : []), ...(verticalMatch.length > minSize ? verticalMatch : [])];

                if (omniMatch.length) {
                    matches.push(omniMatch);
                }
            }
        });

        matches = validate ? this.sanitizeMatches(matches) : matches;

        if (this.runSnapshot.player.hasItem('Extra Piece')) {
            matches.forEach((match: Piece[]) => {
                let itemStack: number = this.runSnapshot.player.items.filter((item: Item) => item.name === 'Extra Piece').length
                let chance: number = 0.10 * itemStack;

                if (Math.random() < chance) {
                    let piecesSameColor: Piece[] = this.cells.flat().map((cell: Cell) => cell.piece).filter((piece: Piece) => piece?.shape?.id === match[0].shape.id && match.findIndex((matchPiece: Piece) => matchPiece.gridPosition.checksum === piece.gridPosition.checksum) === -1);
                    let randomChoice: number = Math.floor(Math.random() * piecesSameColor.length);

                    match.push(piecesSameColor[randomChoice]);
                }
            });
        }

        matches = validate ? this.sanitizeMatches(matches) : matches;

        this.selectedCellPosition = undefined
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

        let sort: (a: Piece, b: Piece) => number = (a: Piece, b: Piece) => {
            return a.gridPosition.checksum > b.gridPosition.checksum ? -1 : 1;
        };

        matches.forEach((match: Piece[]) => {
            match.sort(sort);
            match.sort((piece: Piece) => !!piece.effect ? -1 : 1);
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
        return match.map((piece: Piece) => piece.gridPosition.checksum).join('-');
    }

    generatePieces(allowMatches: boolean = true): boolean {
        let generated: boolean = false;
        if (allowMatches) {
            for (let x = 0; x < this.width; x++) {
                let position: Position = Position.of(x, 0)
                if (this.getPieceByPosition(position) === undefined) {
                    generated = true;
                    this.setCellPiece(position, Piece.generateRandomPiece(position, this.runSnapshot));
                }
            }
        } else {
            let row: Piece[];
            let isHorizontalValid: boolean;

            do {
                isHorizontalValid = true;
                row = [];

                for (let x = 0; x < this.width; x++) {
                    let position: Position = Position.of(x, 0);
                    if (this.getPieceByPosition(position) === undefined) {

                        let generatedPiece: Piece;
                        let isVerticalValid: boolean;

                        do {
                            isVerticalValid = true;
                            generatedPiece = Piece.generateRandomPiece(this.cells[x][0].gridPosition, this.runSnapshot);

                            let lowerMostPosition: Position = this.getNextAvailablePosition(generatedPiece.gridPosition);
                            let nextCell: Cell = this.getCellbyPosition(lowerMostPosition.addY(1));
                            if (nextCell?.piece?.shape?.id === generatedPiece.shape.id) {
                                nextCell = this.getCellbyPosition(nextCell.gridPosition.addY(1));
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
                this.setCellPiece(piece.gridPosition, piece);
            })

        }

        return generated;
    }

    validateSwap(position1: Position, position2: Position): boolean {

        if (this.runSnapshot.player.hasItem('Another Fair Trade')) {
            const triggerChance: number = Math.random();
            const itemCount: number = this.runSnapshot.player.items.filter((item: Item) => item.name === 'Another Fair Trade').length
            if (triggerChance > itemCount * 0.10) {
                this.emit('AnotherFairTrade', Math.random() > 0.5)
            }
        }

        if (this.runSnapshot.player.hasItem('Fair Trade')) {
            const triggerChance: number = Math.random();
            const itemCount: number = this.runSnapshot.player.items.filter((item: Item) => item.name === 'Fair Trade').length
            if (triggerChance > itemCount * 0.10) {
                let choice: boolean = Math.random() > 0.5
                if (choice) {
                    return false;
                } else {
                    this.emit('FairTrade')
                }
            }
        }

        if (position1.checksum === position2.checksum) {
            return false;
        }

        if (this.runSnapshot.player.itemData.omniMoves > 0) {
            this.emit('OmniMoveDone')
        } else {
            if (!this.canReach(position1, position2, this.runSnapshot.player.itemData.reach, this.runSnapshot.player.itemData.diagonals)) {
                return false;
            }
        }

        if (this.canReachDiagonal(position1, this.runSnapshot.player.itemData.reach).map((position: Position) => position.checksum).includes(position2.checksum) &&
            this.runSnapshot.player?.passive?.name === 'Flexible' &&
            !this.runSnapshot.player.hasItem('Diagonal Reach')
        ) {
            this.emit('DiscountDiagonals');
        }

        let piece1: Piece | undefined = this.getPieceByPosition(position1);
        let piece2: Piece | undefined = this.getPieceByPosition(position2);

        if (!piece1 || !piece2) {
            return false;
        }

        return true;
    }

    canReach(pos1: Position, pos2: Position, reach: number, extended: boolean = false): boolean {
        let possibleMoves: Position[] = [];

        for (let currentReach: number = 1; currentReach <= reach; currentReach++) {
            possibleMoves.push(...[
                Position.of(pos1.x - currentReach, pos1.y),
                Position.of(pos1.x + currentReach, pos1.y),
                Position.of(pos1.x, pos1.y - currentReach),
                Position.of(pos1.x, pos1.y + currentReach)
            ]);
        }

        if (extended) {
            possibleMoves.push(...this.canReachDiagonal(pos1, this.runSnapshot.player.itemData.reach));
        }

        return possibleMoves.map((position: Position) => position.checksum).includes(pos2.checksum);
    }

    canReachDiagonal(pos1: Position, reach: number): Position[] {
        let diagonals: Position[] = [];
        for (let currentReach: number = 1; currentReach <= reach; currentReach++) {
            diagonals.push(...[
                Position.of(pos1.x - currentReach, pos1.y - currentReach),
                Position.of(pos1.x + currentReach, pos1.y + currentReach),
                Position.of(pos1.x + currentReach, pos1.y - currentReach),
                Position.of(pos1.x - currentReach, pos1.y + currentReach)
            ]);
        }
        return diagonals
    }


    getSwapDataFromPositions(position1: Position, position2: Position): SwapData {
        let cell1: Cell = this.getCellbyPosition(position1);
        let cell2: Cell = this.getCellbyPosition(position2);
        let piece1: Piece | undefined = this.getPieceByPosition(position1)?.renewPosition(position2);
        let piece2: Piece | undefined = this.getPieceByPosition(position2)?.renewPosition(position1);
        return { piece1, piece2, cell1, cell2 };
    }

    swap(swapData: SwapData): void {
        this.setCellPiece(swapData.cell1.gridPosition, swapData.piece2);
        this.setCellPiece(swapData.cell2.gridPosition, swapData.piece1);

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
            this.emit('MatchesRemoved:' + useCase, data.matches);
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
                let params: RemovePieceAnimationParams = {
                    baseAction: 'RemoveAnimationEnded', useCase, data: {
                        callNextAction: pieceIndex === matchToRemove.length - 1 && matchIndex === matches.length - 1,
                        position: pieceToRemove.gridPosition,
                        matches: matches
                    }
                }
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
            if (position.y === params.piece.gridPosition.y) {
                newMatch.push(this.getPieceByPosition(position));
            }
        })

        newMatch = this.mergeMatches(newMatch, params.match);

        newMatch.forEach((piece: Piece) => {
            if (piece.gridPosition.checksum === params.piece.gridPosition.checksum) {
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
            if (position.x === params.piece.gridPosition.x) {
                newMatch.push(this.getPieceByPosition(position));
            }
        })

        newMatch = this.mergeMatches(newMatch, params.match);

        newMatch.forEach((piece: Piece) => {
            if (piece.gridPosition.checksum === params.piece.gridPosition.checksum) {
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
                let params: RemovePieceAnimationParams = {
                    baseAction: 'RemoveAnimationEnded',
                    useCase,
                    data: {
                        callNextAction: position.x === this.width - 1 && position.y === this.height - 1,
                        position: position,
                        matches: []
                    }
                }

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
                callback(Position.of(x, y));
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
                callback(Position.of(x, y));
            }
        }
    }

    draw(hasDialogOpen: boolean = false): void {
        const canvas: Canvas = Canvas.getInstance();
        const p5 = canvas.p5;

        this.cells.flat().forEach((cell: Cell) => {
            p5.noStroke();

            const limits: Limits = new Limits(Position.of(cell.canvasPosition.x, cell.canvasPosition.y), Position.of(cell.canvasPosition.x + this.sideSize, cell.canvasPosition.y + this.sideSize));
            const highlight: boolean = (!hasDialogOpen && limits.contains(canvas.mousePosition)) || (this.selectedCellPosition ? cell.gridPosition.checksum === this.selectedCellPosition.checksum : false);

            const critical: boolean = this.getPieceByPosition(cell.gridPosition)?.critical;
            const color1: Color = critical ? new Color(203, 67, 53) : new Color(136, 78, 160);
            const color2: Color = critical ? new Color(236, 112, 99) : new Color(175, 122, 197);

            if (cell?.piece?.effect) {
                if (['Vertical AOE', 'Horizontal AOE'].includes(cell.piece.effect.id)) {
                    rectWithStripes(
                        cell.canvasPosition,
                        Position.of(this.sideSize, this.sideSize),
                        6,
                        cell.piece.effect.id === 'Horizontal AOE',
                        color1,
                        color2,
                        highlight ? 200 : 255
                    );
                }

                if (cell.piece.effect.id === 'Money') {
                    p5.fill(color1.alpha(highlight ? 200 : 255).value);
                    p5.rect(
                        cell.canvasPosition.x,
                        cell.canvasPosition.y,
                        this.sideSize,
                        this.sideSize,
                        canvas.radius
                    );

                    p5.textAlign(p5.LEFT, p5.TOP);
                    p5.fill(Color.YELLOW.value);
                    p5.stroke(Color.BLACK.value);
                    p5.strokeWeight(canvas.stroke);
                    p5.textSize(canvas.uiData.fontTitle);
                    p5.text(
                        '$',
                        cell.canvasPosition.x + canvas.padding,
                        cell.canvasPosition.y + canvas.padding
                    );
                }
            } else {
                p5.fill(color1.alpha(highlight ? 200 : 255).value);
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

    drawPieces(): void {
        this.cells.flat().forEach((cell: Cell) => {
            if (cell.piece) {
                cell.piece.cellSideSize = this.sideSize;
                cell.piece.initialPosition = cell.canvasPosition
                cell.piece.draw();
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

    setCellPiece(position: IPosition, piece: Piece | undefined): void {
        this.cells[position.x][position.y].piece = piece;
    }

    getPieceByPosition(position: IPosition): Piece | undefined {
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
        let absoluteX: number = cell.gridPosition.x + xOffset;
        let absoluteY: number = cell.gridPosition.y + yOffset;

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
                swapData.piece1.setupSwapAnimation(10, swapData.cell2.canvasPosition.difference(swapData.cell1.canvasPosition), { baseAction: 'SwapAnimationEnded', useCase: '', data: { callNextAction: true, swapData } });
            }

            if (swapData.piece2) {
                swapData.piece2.setupSwapAnimation(10, swapData.cell2.canvasPosition.minus(swapData.cell1.canvasPosition), { baseAction: 'SwapAnimationEnded', useCase: '', data: { callNextAction: false } });
            }
        }
    }

}

export interface SwapData extends ISwapData {
    piece1: Piece;
    piece2: Piece;
    cell1: Cell;
    cell2: Cell;
}