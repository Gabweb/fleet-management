import RpcTransport from './RpcTransport';
import WebSocket from 'ws';
export default class WebSocketTransport extends RpcTransport {
    public override name: string = 'ws';
    #ws: WebSocket;

    constructor(ws: WebSocket) {
        super();
        this.#ws = ws;
        ws.on('close', () => {
            this._eventEmitter.emit('close');
        });
        ws.on('error', (e) => {
            this._eventEmitter.emit('error', e);
        });
        ws.on('message', (message: any) => {
            this.parseMessage(message);
        });
    }

    protected _sendRPC(params: string) {
        this.#ws.send(params);
    }

    public override destroy(): void {
        super.destroy();
        this.#ws.close();
    }
}
