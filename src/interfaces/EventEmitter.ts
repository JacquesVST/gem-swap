import { EventEmitter as EE } from "events";

export class IEventHandler {
    eventEmitter: EE;

}
export interface IEventEmitter {
    eventHandler: IEventHandler;
    params: IEventParams;
    log: boolean;
    className: string;
}

export interface IEventParams {
    baseAction?: string;
    useCase: string;
    data?: any;
}