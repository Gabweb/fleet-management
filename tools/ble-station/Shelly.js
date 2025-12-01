"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connect = void 0;
const events_1 = __importDefault(require("events"));
//Shelly BLE service and characteristics UUID (Gen2)
const SHELLY_GATT_SERVICE_UUID = '5f6d4f53-5f52-5043-5f53-56435f49445f';
const SHELLY_GATT_CHARACTERISTICS = {
    RPC_CHAR_DATA_UUID: '5f6d4f53-5f52-5043-5f64-6174615f5f5f',
    RPC_CHAR_TX_CTL_UUID: '5f6d4f53-5f52-5043-5f74-785f63746c5f',
    RPC_CHAR_RX_CTL_UUID: '5f6d4f53-5f52-5043-5f72-785f63746c5f',
};
async function readShellyDataAsync(characteristic, size) {
    try {
        let _resultString = '';
        while (_resultString.length < size) {
            // console.log('Reading dataCharacteristic for response');
            const _buf = await characteristic.readValue();
            const _tStr = _buf.toString();
            _resultString += _tStr;
        }
        return _resultString;
    }
    catch (error) {
        console.error(`Error reading ble data`);
        return "";
    }
}
async function connect(device, name) {
    const eventEmitter = new events_1.default();
    const waiting = new Map();
    let waitingId = 0;
    let openned = false;
    await device.connect();
    const gattServer = await device.gatt();
    // console.log('GATT server on peripheral aquired');
    const shellyBLEService = await gattServer.getPrimaryService(SHELLY_GATT_SERVICE_UUID);
    const dataCharacteristic = await shellyBLEService.getCharacteristic(SHELLY_GATT_CHARACTERISTICS.RPC_CHAR_DATA_UUID);
    const rxCharacteristic = await shellyBLEService.getCharacteristic(SHELLY_GATT_CHARACTERISTICS.RPC_CHAR_RX_CTL_UUID);
    const txCharacteristic = await shellyBLEService.getCharacteristic(SHELLY_GATT_CHARACTERISTICS.RPC_CHAR_TX_CTL_UUID);
    eventEmitter.emit('open');
    openned = true;
    rxCharacteristic.startNotifications();
    rxCharacteristic.on('valuechanged', async (buffer) => {
        try {
            // console.log('Result available', buffer.readUInt32BE());
            const respLength = buffer.readUInt32BE();
            // console.log('Response length', _respLength);
            const response = await readShellyDataAsync(dataCharacteristic, respLength);
            // console.log('Response', _response);
            const message = JSON.parse(response);
            if (message.id && waiting.has(message.id)) {
                waiting.get(message.id)(message);
            }
            eventEmitter.emit('message', message);
        }
        catch (error) {
            eventEmitter.emit('read_error', error, buffer);
        }
    });
    async function send(method, params, cb) {
        const message = JSON.stringify({
            id: waitingId,
            src: 'fleet-manager-ble',
            method,
            params
        });
        waitingId++;
        if (cb) {
            waiting.set(waitingId, cb);
        }
        const _requestBuf = Buffer.from(message, 'ascii');
        let _requestSizeBuf = Buffer.alloc(4);
        _requestSizeBuf.writeUInt32BE(_requestBuf.length);
        // console.log('Request of size', _requestSizeBuf.length, _requestSizeBuf.toString('hex'));
        await txCharacteristic.writeValue(_requestSizeBuf, { type: 'request' });
        // console.log('Sending request', _requestBuf.toString());
        await dataCharacteristic.writeValue(_requestBuf, { type: 'request' });
    }
    async function disconnect() {
        await rxCharacteristic.stopNotifications();
        await device.disconnect();
        eventEmitter.emit('close');
        eventEmitter.removeAllListeners();
        console.debug(`[${name}] Disconnected`);
    }
    function on(event, cb) {
        eventEmitter.on(event, cb);
        if (event === 'open' && openned) {
            eventEmitter.emit('open');
        }
    }
    return {
        send,
        disconnect,
        on
    };
}
exports.connect = connect;
