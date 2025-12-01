import log4js from 'log4js';
import type WebSocket from 'ws';
import ShellyDeviceFactory from '../../../../model/ShellyDeviceFactory';
import WebSocketTransport from '../../../../model/transport/WebsocketTransport';
import * as DeviceCollector from '../../../../modules/DeviceCollector';
import {statusSelectivePush} from '../../../../modules/ShellyMessageHandler';
import * as WaitingRoom from '../../../../modules/WaitingRoom';
import {execInternal} from '../../../Commander';
import AbstractWebsocketHandler from './AbstractWebsocketHandler';

const logger = log4js.getLogger('shelly-ws');

const UNSET_WS_CONFIG = JSON.stringify({
    id: 998,
    method: 'WS.SetConfig',
    params: {
        config: {
            server: '#',
            enable: false
        }
    }
});

const REBOOT_SHELLY = JSON.stringify({
    id: 999,
    method: 'Shelly.Reboot'
});

export default class ShellyWebsocketHandler extends AbstractWebsocketHandler {
    protected override _handleWebsocket(ws: WebSocket): void {
        const messageListener = async (rawData: WebSocket.RawData) => {
            let message: any;
            try {
                message = JSON.parse(rawData.toString('utf-8'));
            } catch (error) {
                logger.warn('Cannot parse message on /shelly');
                ws.close(4001);
                return;
            }

            if (
                typeof message !== 'object' ||
                typeof message.method !== 'string' ||
                typeof message.src !== 'string'
            ) {
                logger.warn(
                    'bad message on /shelly msg:[%s]',
                    JSON.stringify(message)
                );
                ws.close(4002);
                return;
            }

            if (message.method === 'NotifyFullStatus') {
                const shellyID = message.src;

                if (shellyID === undefined) {
                    logger.warn(
                        "unparsable shellyID in 'NotifyFullStatus' on /shelly",
                        message
                    );
                    ws.close(4003);
                    return;
                }

                const onApprove = async () => {
                    // do not listen anymore
                    ws.removeListener('message', messageListener);

                    logger.info(
                        'Registering new websocket client for shellyID:[%s]',
                        shellyID
                    );
                    const transport = new WebSocketTransport(ws);
                    const shelly =
                        await ShellyDeviceFactory.fromWebsocket(transport);
                    shelly.setStatus(message.params);
                    DeviceCollector.register(shelly);
                    try {
                        await statusSelectivePush(message, shelly);
                    } catch (e) {
                        logger.error('Status Selective push: ', e);
                    }
                };

                const onDeny = () => {
                    // Device is rejected, unset config & reboot
                    ws.send(UNSET_WS_CONFIG);
                    ws.send(REBOOT_SHELLY);
                    ws.close(1008);
                };

                const config = await execInternal('WaitingRoom.GetConfig');

                // Check if waiting room is disabled
                if (typeof config.enable === 'boolean' && !config.enable) {
                    onApprove();
                    return;
                }

                // Add to waiting room
                WaitingRoom.addDevice(
                    shellyID,
                    message.params,
                    onApprove,
                    onDeny
                );
            }
        };
        ws.on('message', messageListener);
    }
}
