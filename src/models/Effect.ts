import { IEffect, IEffectParams, IPiece } from "../interfaces";
import { Piece } from "./Piece";

export class Effect implements IEffect{
    id: string
    effect: (params: EffectParams) => void;
    chance: number;

    constructor(id: string, effect: (params: EffectParams) => void, chance: number) {
        this.id = id;
        this.effect = effect;
        this.chance = chance;
    }
}

export class EffectParams implements IEffectParams{
    piece: Piece;
    match: Piece[];
    matches: Piece[][];

    constructor(piece?: Piece, match?: Piece[], matches?: Piece[][]) {
        this.piece = piece;
        this.match = match;
        this.matches = matches;
    }
}