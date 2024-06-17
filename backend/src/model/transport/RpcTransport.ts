/* eslint-disable no-undef */
import * as log4js from 'log4js';
import { ShellyDeviceEmitter } from '../TypedEventEmitter';
import {
    ShellyMessageData,
    ShellyMessageIncoming,
    ShellyMessageUnsafe,
    ShellyResponseCallback,
} from '../../types';
import { ERROR_CODES, buildOutgoingJsonRpcError } from '../../tools/jsonrpc';
const logger = log4js.getLogger();

interface StoredMessage {
    req?: ShellyMessageData;
    resolve: (resp: ShellyMessageIncoming, req?: ShellyMessageData) => void;
    reject: (error: any) => void;
    silent?: boolean;
    startedTs: number;
}

const RPC_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export default abstract class RpcTransport {
    #shellyMessageMap = new Map<number, StoredMessage>();
    #uniqueID = 0;
    #intervalId: NodeJS.Timeout;
    protected _messageListeners: ShellyResponseCallback[] = [];
    protected _eventEmitter: ShellyDeviceEmitter;

    public abstract readonly name: string;

    constructor() {
        this._eventEmitter = new ShellyDeviceEmitter();
        this.#intervalId = setInterval(() => {
            this.#clearOldMessages();
        }, 30 * 1000);
    }

    #clearOldMessages() {
        const now = Date.now();
        for (const [key, value] of this.#shellyMessageMap.entries()) {
            if (now > value.startedTs + RPC_TIMEOUT_MS) {
                value.reject(buildOutgoingJsonRpcError(ERROR_CODES.TIMEOUT_ERROR));
                this.#shellyMessageMap.delete(key);
            }
        }
    }

    protected abstract _sendRPC(data: string): void;

    public sendRPC(method: string, params: any = null, silent = false) {
        this.#uniqueID += 1;
        const message: ShellyMessageData = {
            jsonrpc: '2.0',
            id: this.#uniqueID,
            src: 'FLEET_MANAGER',
            method,
            ...(params && { params }),
        };
        const toSend = JSON.stringify(message);
        this._sendRPC(toSend);

        return new Promise<any>((resolve, reject) => {
            this.#shellyMessageMap.set(this.#uniqueID, {
                req: message,
                resolve,
                reject,
                silent,
                startedTs: Date.now(),
            });
        });
    }

    public sendUnsafe(message: ShellyMessageUnsafe) {
        this._sendRPC(JSON.stringify(message));
    }

    public parseMessage(message: any): ShellyMessageIncoming | undefined {
        try {
            message = JSON.parse(message);
        } catch (error) {
            logger.error('transport failed to parse message as JSON');
            this._eventEmitter.emit('parse_error', message);
            return undefined;
        }

        if (message.method == undefined) {
            if (message.id == undefined) {
                logger.debug(
                    'Transport parseMessage NO id NO method msg:[%s]',
                    JSON.stringify(message)
                );
                this._eventEmitter.emit('parse_error', message);
                return undefined; // no method and no id
            }
        }

        const handler = this.#shellyMessageMap.get(message.id);
        // Remove from map
        this.#shellyMessageMap.delete(message.id);

        if (message.id && !handler) {
            return;
        }

        if (handler) {
            if (message.error) {
                handler.reject(message.error);
            } else if (message.result) {
                handler.resolve(message.result);
            }
        }

        if (
            typeof handler?.silent === 'undefined' ||
            (typeof handler.silent === 'boolean' && handler.silent)
        ) {
            this._eventEmitter.emit('message', message, handler?.req);
        }

        return message;
    }

    public destroy() {
        const error = buildOutgoingJsonRpcError(ERROR_CODES.DEVICE_NOT_FOUND_ERROR);
        for (const handler of this.#shellyMessageMap.values()) {
            handler.reject(error);
        }
        clearInterval(this.#intervalId);
    }

    get eventemitter() {
        return this._eventEmitter;
    }
}
