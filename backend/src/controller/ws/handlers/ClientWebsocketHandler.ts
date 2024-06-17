import { IncomingMessage } from 'http';
import AbstractWebsocketHandler, { WebSocketExt } from './AbstractWebsocketHandler';
import WebSocket from 'ws';
import { user_t } from '../../../types';
import { getUserFromToken } from '../../../model/User';
import MessageHandler from '../MessageHandler';

export default class ClientWebsocketHandler extends AbstractWebsocketHandler {
    #messageHandler: MessageHandler;

    constructor(handler: MessageHandler) {
        super();
        this.#messageHandler = handler;
    }

    protected override _handleWebsocket(
        socket: WebSocketExt,
        request: IncomingMessage
    ): void {
        let msgQueue: WebSocket.RawData[] = [];

        const token = String(request.headers['token']);
        let user: user_t;
        getUserFromToken(token)
            .then(
                (newUser) => {
                    if (!newUser) {
                        socket.terminate();
                        return;
                    }
                    user = newUser;
                    for (const msg of msgQueue) {
                        this.#messageHandler.handleMessage(socket, user, msg);
                    }
                    msgQueue.length = 0;
                },
                () => {
                    socket.terminate();
                }
            )
            .finally(() => {
                // always clear msg queue
                msgQueue.length = 0;
            });

        socket.on('message', async (data) => {
            if (user == undefined) {
                // store in queue
                msgQueue.push(data);
                return;
            }

            this.#messageHandler.handleMessage(socket, user, data);
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
