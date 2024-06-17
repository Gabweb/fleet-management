import AbstractWebsocketHandler, { WebSocketExt } from './AbstractWebsocketHandler';
import { NODE_RED_USER } from '../../../model/User';
import MessageHandler from '../MessageHandler';

export default class LocalWebscoketHandler extends AbstractWebsocketHandler {
    #messageHandler: MessageHandler;

    constructor(handler: MessageHandler) {
        super({ host: '127.0.0.1', port: 7012 });
        this.#messageHandler = handler;
    }

    protected override _handleWebsocket(socket: WebSocketExt) {
        socket.on('message', (data) => {
            this.#messageHandler.handleMessage(socket, NODE_RED_USER, data);
        });
    }
}
