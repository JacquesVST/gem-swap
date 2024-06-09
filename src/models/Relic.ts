import { IStat } from "../interfaces";
import { generateId, writeCamel } from "../utils/General";

export class Relic {
    id: string;
    name: string;
    power: number;
    stat1: IStat;
    stat2: IStat;
    stat3: IStat;

    constructor(power: number, stat1?: IStat, stat2?: IStat, stat3?: IStat) {
        this.id = generateId();
        this.power = power;
        this.stat1 = stat1;
        this.stat2 = stat2;
        this.stat3 = stat3;

        if (stat1.rawBonus >= stat2.rawBonus && stat1.rawBonus >= stat3.rawBonus) {
            this.name = `${writeCamel(stat1.name)} Charm`;
        }

        if (stat2.rawBonus >= stat1.rawBonus && stat2.rawBonus >= stat3.rawBonus) {
            this.name = `${writeCamel(stat2.name)} Charm`;
        }

        if (stat3.rawBonus >= stat1.rawBonus && stat3.rawBonus >= stat2.rawBonus) {
            this.name = `${writeCamel(stat3.name)} Charm`;
        }
    }
}
