import type {WebComponentConfig} from '../../../../model/component/WebComponent';
import {NODE_RED_USER} from '../../../user';
import type MessageHandler from '../MessageHandler';
import AbstractWebsocketHandler, {
    type WebSocketExt
} from './AbstractWebsocketHandler';

export default class LocalWebsocketHandler extends AbstractWebsocketHandler {
    #messageHandler: MessageHandler;

    constructor(handler: MessageHandler, config: Required<WebComponentConfig>) {
        super({host: '127.0.0.1', port: config.port + 1});
        this.#messageHandler = handler;
    }

    protected override _handleWebsocket(socket: WebSocketExt) {
        socket.on('message', (data) => {
            this.#messageHandler.handleMessageRaw(socket, data, NODE_RED_USER);
        });
    }
}
