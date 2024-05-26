import { EventEmitter as EE } from "events";

export class EventHandler {
    private static instance: EventHandler;
    eventEmitter: EE;

    private constructor() {
        this.eventEmitter = new EE();
    }

    static getInstance(): EventHandler {
        if (!EventHandler.instance) {
            EventHandler.instance = new EventHandler();
        }
        return EventHandler.instance;
    }
}

export class EventEmitter {
    eventHandler: EventHandler;
    params: EventParams;
    log: boolean;
    className: string;

    constructor(className: string) {
        this.eventHandler = EventHandler.getInstance();
        this.log = !!localStorage.getItem('log');
        this.className = className;
    }

    get events(): EE {
        return this.eventHandler.eventEmitter;
    }

    emit(event: string, ...params: any): void {
        if (this.log && !event.includes('Animation')) {
            console.log('%c%s emitted with', 'color:cyan', `${this.className}:${event}`, params);
        }
        this.events.emit(`${this.className}:${event}`, ...params);
    }

    clear(): void {
        this.events.removeAllListeners();
    }

    on(eventName: string, listener: (...params: any) => void): void {
        this.events.on(eventName, (...params: any) => {
            if (this.log && !eventName.includes('Animation')) {
                console.log('%c%s%c listened to %c%s', 'color:orange', `${this.className}`, 'background:inherit;', 'color:yellow;', eventName);
            }
            listener(...params);
        });
    }

}

export interface ConfigureListeners {
    configureListeners(): void;
}

export interface EventParams {
    baseAction?: string;
    useCase: string;
    data?: any;
}

