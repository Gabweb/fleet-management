import RpcError from '../../rpc/RpcError';
import RpcTransport from './RpcTransport';

import log4js from 'log4js';
const logger = log4js.getLogger();

export default class HttpTransport extends RpcTransport {
    public override name = 'local';
    #deviceIp: string;

    constructor(deviceIp: string) {
        super();
        this.#deviceIp = deviceIp;
    }

    protected async _sendRPC(params: string): Promise<void> {
        try {
            const res: Response = await fetch(`http://${this.#deviceIp}/rpc`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: params
            });
            if (!res.ok) {
                throw new Error(`StatusCode:${res.status}`);
            }
            const message = await res.json();
            logger.debug('httpTransport sendRPC message[%s]', message);
            this.parseMessage(JSON.stringify(message));
        } catch (error: any) {
            logger.error(
                'Failed to send rpc to ip=[%s]',
                this.#deviceIp,
                error.message
            );
            this._eventEmitter.emit('err', error);
            this.parseMessage(RpcError.DeviceNotFound().getErrorObject());
        }
    }
}
