import { EventEmitter } from 'events';
import { ShellyMessageData, ShellyMessageIncoming } from '../types';

class TypedEventEmitter<TEvents extends Record<string, any>> {
    #emitter = new EventEmitter();

    emit<TEventName extends keyof TEvents & string>(
        eventName: TEventName,
        ...eventArg: TEvents[TEventName]
    ) {
        this.#emitter.emit(eventName, ...(eventArg as []));
    }

    on<TEventName extends keyof TEvents & string>(
        eventName: TEventName,
        handler: (...eventArg: TEvents[TEventName]) => void
    ) {
        this.#emitter.on(eventName, handler as any);
    }

    off<TEventName extends keyof TEvents & string>(
        eventName: TEventName,
        handler: (...eventArg: TEvents[TEventName]) => void
    ) {
        this.#emitter.off(eventName, handler as any);
    }

    removeAllListeners() {
        this.#emitter.removeAllListeners();
    }
}

export interface ShellyDeviceEvents {
    close: [];
    message: [res: ShellyMessageIncoming, req?: ShellyMessageData];
    error: [err?: any];
    parse_error: [msg: any];
}

export class ShellyDeviceEmitter extends TypedEventEmitter<ShellyDeviceEvents> {}
