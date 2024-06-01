import { IBestNumbers, IUnlocks } from "../interfaces";

export function getBestNumbers(): IBestNumbers {
    let bests: IBestNumbers = JSON.parse(localStorage.getItem('bests'))
    return bests ? bests : { bestCombo: 0, bestDamage: 0, bestScore: 0 }
}

export function setBestNumbers(numbers: IBestNumbers): void {
    return localStorage.setItem('bests', JSON.stringify(numbers));
}

export function getUnlocks(): IUnlocks[] {
    const unlocks: IUnlocks[] = JSON.parse(localStorage.getItem('unlocks'))
    return unlocks ? unlocks : [];
}

export function setUnlocks(unlocks: IUnlocks[]): void {
    return localStorage.setItem('unlocks', JSON.stringify(unlocks));
}