import * as http from 'http';
import { parse } from 'url';
import { getLogger } from 'log4js';
const logger = getLogger('ws-upgrade');
import * as User from '../../model/User';
import { Duplex } from 'stream';
import ShellyWebsocketHandler from './handlers/ShellyWebsocketHandler';
import ClientWebsocketHandler from './handlers/ClientWebsocketHandler';

function destroySocket(
    socket: Duplex,
    httpTextStatus: '401 Unauthorized' | '403 Forbidden'
) {
    logger.debug('destroying websocket reason:[%s]', httpTextStatus);
    socket.write(`HTTP/1.1 ${httpTextStatus}\r\n\r\n`);
    socket.destroy();
}

export default class WebsocketController {
    #server: http.Server;
    #shellyHandler: ShellyWebsocketHandler;
    #clientHandler: ClientWebsocketHandler;

    constructor(
        server: http.Server,
        shellyHandler: ShellyWebsocketHandler,
        clientHandler: ClientWebsocketHandler
    ) {
        this.#server = server;
        this.#shellyHandler = shellyHandler;
        this.#clientHandler = clientHandler;
        this.#handleUpgrades();
    }

    #handleUpgrades() {
        this.#server.on('upgrade', (request, socket, head) => {
            if (request.url == undefined) {
                logger.debug('destroying bad socket');
                socket.destroy();
                return;
            }
            const { pathname } = parse(request.url);

            if (pathname == null) {
                logger.debug('destroying bad socket');
                socket.destroy();
                return;
            }

            if (pathname.startsWith('/node-red')) return;

            // handle without authentication
            if (pathname === '/shelly') {
                this.#shellyHandler.handleUpgrade(request, socket, head);
                return;
            }

            // Extract authentication
            let protocol = request.headers['sec-websocket-protocol'];
            let auth: string | undefined = undefined;

            if (typeof protocol === 'string' && protocol.length > 0) {
                auth = 'Bearer ' + protocol;
            } else {
                let authorization = request.headers['authorization'];
                if (typeof authorization === 'string' && authorization.length > 0) {
                    auth = authorization;
                }
            }
            let token: string;

            if (User.allowDebug) {
                logger.warn('Allowing a debug token');
                token = User.generateDebugToken();
            } else {
                // no authorization, close ws
                if (typeof auth !== 'string' || auth.length == 0) {
                    destroySocket(socket, '401 Unauthorized');
                    return;
                }
                const extracted = auth.split(' ').at(-1)!;
                logger.info('websocket token:[%s]', extracted);

                // no token, close ws
                if (extracted == undefined) {
                    destroySocket(socket, '401 Unauthorized');
                    return;
                }

                token = extracted;
            }

            if (pathname === '/') {
                request.headers['token'] = token;
                this.#clientHandler.handleUpgrade(request, socket, head);
                return;
            }

            socket.destroy();
        });
    }
}
