import { IncomingMessage } from 'http';
import { Duplex } from 'stream';
import WebSocket from 'ws';

type Options = ConstructorParameters<typeof WebSocket.Server>[0];
export type WebSocketExt = WebSocket.WebSocket & { isAlive: boolean };

export default abstract class AbstractWebsocketHandler {
    protected _server: WebSocket.Server;
    #interval: NodeJS.Timeout;

    constructor(
        options: Options = {
            noServer: true,
        }
    ) {
        this._server = new WebSocket.Server(options);
        this.#interval = this.#createHeartbeat();
        this._server.on(
            'connection',
            (ws: WebSocketExt, request: IncomingMessage) => {
                this._handleWebsocket(ws, request);
                ws.on('pong', () => {
                    ws.isAlive = true;
                });
            }
        );
        this._server.on('close', () => {
            clearInterval(this.#interval);
        });
    }

    public handleUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer) {
        this._server.handleUpgrade(request, socket, head, (ws) => {
            this._server.emit('connection', ws, request);
        });
    }

    /**
     * Heartbeat listener
     * @tutorial https://github.com/websockets/ws#how-to-detect-and-close-broken-connections
     */
    #createHeartbeat() {
        return setInterval(() => {
            const clients = this._server.clients as Set<WebSocketExt>;
            clients.forEach(function each(ws: WebSocketExt) {
                if (ws.isAlive === false) {
                    console.error('Closing socket bc of ping/pong timeout');
                    ws.terminate();
                    ws.emit('close', 'TIMEOUT');
                    return;
                }

                ws.isAlive = false;
                ws.ping();
            });
        }, 30000);
    }

    protected abstract _handleWebsocket(
        ws: WebSocketExt,
        request: IncomingMessage
    ): void;
}
