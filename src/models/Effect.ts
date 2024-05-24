import { Piece } from "./Piece";

export class Effect {
    id: string
    effect: (params: EffectParams) => void;
    chance: number;

    constructor(id: string, effect: (params: EffectParams) => void, chance: number) {
        this.id = id;
        this.effect = effect;
        this.chance = chance;
    }
}

export class EffectParams {
    piece: Piece;
    match: Piece[];
    matches: Piece[][];

    constructor(piece?: Piece, match?: Piece[], matches?: Piece[][]) {
        this.piece = piece;
        this.match = match;
        this.matches = matches;
    }
}