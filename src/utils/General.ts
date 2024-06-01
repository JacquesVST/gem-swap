export function generateId(): string {
    return "id" + Math.random().toString(16).slice(2)
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
