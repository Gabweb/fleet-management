import WebSocket from 'ws';
import { user_t } from '../../types';
import {
    ERROR_CODES,
    buildOutgoingJsonRpc,
    buildOutgoingJsonRpcError,
    incoming_jsonrpc,
    parseIncomingJsonRpc,
} from '../../tools/jsonrpc';
import log4js from 'log4js';
import * as Commander from '../../modules/Commander';
const logger = log4js.getLogger('message-handler');
import * as DeviceCollector from '../../modules/DeviceCollector';

const ERROR = {
    INVALID_REQUEST: JSON.stringify(
        buildOutgoingJsonRpcError(ERROR_CODES.INVALID_REQUEST, null)
    ),
    BAD_DST_ARGUMENT: (id: number) =>
        JSON.stringify(
            buildOutgoingJsonRpcError(
                ERROR_CODES.INVALID_REQUEST,
                id,
                undefined,
                'BAD DST ARGUMENT'
            )
        ),
    NO_SUCH_DEVICE: (id: number) =>
        JSON.stringify(
            buildOutgoingJsonRpcError(
                ERROR_CODES.INVALID_REQUEST,
                id,
                undefined,
                'NO SUCH DEVICE'
            )
        ),
};

export default class MessageHandler {
    /**
     * Handle one incomming messages or array of incomming messages
     * @param socket Websocket sending the command
     * @param data parsed data
     * @param user user with their permissions
     */
    handleMessage(
        socket: WebSocket.WebSocket,
        user: user_t,
        data: WebSocket.RawData
    ) {
        try {
            const parsed = JSON.parse(data.toString());
            if (typeof parsed === 'object' && Array.isArray(parsed)) {
                for (const single of parsed) {
                    this.#handleIncomingMessage(socket, single, user);
                }
                return;
            }
            this.#handleIncomingMessage(socket, parsed, user);
        } catch (error) {
            logger.warn('error json parsing ws data', String(error));
            socket.send(
                JSON.stringify(
                    buildOutgoingJsonRpcError(ERROR_CODES.PARSE_ERROR, null)
                )
            );
            return;
        }
    }

    /**
     * Handle single incomming message
     * @param socket Websocket sending the command
     * @param data parsed data
     * @param user user with their permissions
     */
    #handleIncomingMessage(
        socket: WebSocket.WebSocket,
        data: incoming_jsonrpc,
        user: user_t
    ) {
        if (!parseIncomingJsonRpc(data)) {
            logger.warn('error parsing incoming ws data');
            socket.send(ERROR.INVALID_REQUEST);
            return;
        }

        logger.debug(
            `Received ${data.method} with ${JSON.stringify(data.params || {})} from ${user.username}:${user.group} for ${data.dst}`
        );

        // handle internal commands

        if (
            typeof data.dst === 'string' &&
            data.dst?.toUpperCase() === 'FLEET_MANAGER'
        ) {
            this.#handleInternalCommands(socket, data, user);
            return;
        }

        // relay commands to connected devices

        if (typeof data.dst !== 'undefined') {
            this.#handleRelayCommands(socket, data);
            return;
        }

        logger.warn('unhandled ws data');
        // always respond (as per protocol)
        socket.send(ERROR.INVALID_REQUEST);
    }

    /**
     * Relay one or more commands to connected devices
     * @param socket Websocket sending the command
     * @param data parsed data
     */
    #handleRelayCommands(socket: WebSocket.WebSocket, data: incoming_jsonrpc) {
        if (typeof data.dst === 'string') {
            this.#singleRelayCommand(socket, data.dst, data);
        } else if (typeof data.dst === 'object' && Array.isArray(data.dst)) {
            for (const dst of data.dst)
                if (typeof dst === 'string') {
                    this.#singleRelayCommand(socket, dst, data);
                }
        } else {
            socket.send(ERROR.BAD_DST_ARGUMENT(data.id));
        }
    }

    /**
     * Relay an rpc command to connected device
     * @param socket Websocket sending the command
     * @param data parsed data
     * @param shellyID id of the receiver
     */
    #singleRelayCommand(
        socket: WebSocket.WebSocket,
        shellyID: string,
        data: incoming_jsonrpc
    ) {
        const shelly = DeviceCollector.getDevice(shellyID);
        if (shelly == undefined) {
            socket.send(ERROR.NO_SUCH_DEVICE(data.id));
            return;
        }

        const { method, params, src, id } = data;
        shelly.sendRPC(method, params, true).then((resp) => {
            const result = buildOutgoingJsonRpc(id, src, resp);
            socket.send(JSON.stringify(result));
        });
    }

    /**
     * Handle commands targeted at the Fleet Manager itself
     * @param socket Websocket sending the command
     * @param data parsed data
     * @param user user with permissions
     */
    async #handleInternalCommands(
        socket: WebSocket.WebSocket,
        data: incoming_jsonrpc,
        user: { group: string; permissions: string[] }
    ) {
        const params = data.params;

        try {
            const result = await Commander.exec(
                {
                    group: user.group,
                    permissions: user.permissions,
                    additional: {
                        socket,
                    },
                },
                data.method,
                params
            );
            socket.send(
                JSON.stringify(buildOutgoingJsonRpc(data.id, data.src, result))
            );
        } catch (err: any) {
            let { error, error_code } = err;
            error ??= err.message;
            error_code ??= ERROR_CODES.SERVER_ERROR;
            logger.warn(
                'Sending error_code:[%s] error:[%s] method:[%s] params:[%s]',
                error_code,
                error,
                data.method,
                params
            );
            socket.send(
                JSON.stringify(
                    buildOutgoingJsonRpcError(
                        error_code,
                        data.id,
                        data.src,
                        error || null
                    )
                )
            );
        }
    }
}
