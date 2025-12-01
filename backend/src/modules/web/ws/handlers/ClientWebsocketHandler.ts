import type {IncomingMessage} from 'node:http';
import WebSocket from 'ws';
import type {user_t} from '../../../../types';
import {getUserFromToken} from '../../../user';
import type MessageHandler from '../MessageHandler';
import AbstractWebsocketHandler, {
    type WebSocketExt
} from './AbstractWebsocketHandler';

export default class ClientWebsocketHandler extends AbstractWebsocketHandler {
    #messageHandler: MessageHandler;

    constructor(handler: MessageHandler) {
        super();
        this.#messageHandler = handler;
    }

    protected override async _handleWebsocket(
        socket: WebSocketExt,
        request: IncomingMessage
    ) {
        const msgQueue: WebSocket.RawData[] = [];

        const token = String(request.headers.token);
        let user: user_t;

        try {
            const newUser = await getUserFromToken(token);
            if (!newUser) {
                console.error('CANNOT GET USER FROM TOKEN', token);
                socket.terminate();
                return;
            }
            user = newUser;
            for (const msg of msgQueue) {
                this.#messageHandler.handleMessageRaw(socket, msg, user);
            }
            msgQueue.length = 0;
        } catch (error) {
            console.error(error);
            socket.terminate();
            msgQueue.length = 0;
        }

        socket.on('message', async (data) => {
            if (user === undefined) {
                // store in queue
                msgQueue.push(data);
                return;
            }

            this.#messageHandler.handleMessageRaw(socket, data, user);
        });
    }

    notifyAll(msg: string) {
        for (const client of this._server.clients) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(msg);
            }
        }
    }
}
