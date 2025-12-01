import * as fs from 'node:fs';
import path from 'node:path';
import {isMainThread, parentPort, workerData} from 'node:worker_threads';
import type {
    FleetManagerPlugin,
    PluginData,
    event_data_t,
    json_rpc_event
} from '../../types';

if (isMainThread) {
    console.warn('Somehow the plugin worker is in the main thread');
    process.exit(-1);
}

function unhandledError(error: Error) {
    console.error('Plugins Uncaught Error err=[%s]', String(error));
    console.error(error);
}

process.on('uncaughtException', unhandledError);
process.on('unhandledRejection', unhandledError);

interface define_component_t {
    name: string;
    methods: Map<string, (params: any, sender: any) => Promise<any>>;
}

const pluginData: PluginData = workerData;
let plugin: FleetManagerPlugin;

let waiting_id = 0;
const waiting: Map<
    number,
    {resolve: (r?: any) => any; reject: (r?: any) => any}
> = new Map();

const components: Map<string, define_component_t> = new Map();

function call(method: string, params?: any): Promise<any> {
    parentPort?.postMessage(['call_commander', waiting_id, method, params]);
    return new Promise((resolve, reject) => {
        waiting.set(waiting_id, {resolve, reject});
        waiting_id = waiting_id + 1;
    });
}

function defineComponent(component: define_component_t) {
    parentPort?.postMessage([
        'register_component',
        component.name,
        ...Array.from(component.methods.keys())
    ]);
    components.set(component.name, component);
}

async function commandCalled(others: any[]) {
    const [id, command, method, params, sender] = others;
    if (components.has(command)) {
        const component = components.get(command)!;
        if (component.methods.has(method)) {
            const methodCb = component.methods.get(method)!;
            try {
                const res = await methodCb(params, sender);
                parentPort?.postMessage([
                    'command_response',
                    id,
                    'resolve',
                    res
                ]);
            } catch (err) {
                parentPort?.postMessage([
                    'command_response',
                    id,
                    'reject',
                    err
                ]);
            }
            return;
        }
    }
    parentPort?.postMessage([
        'command_response',
        id,
        'reject',
        {error: 'not found'}
    ]);
}

function commanderResponse(others: any[]) {
    const [id, response_type, data] = others;
    const {resolve, reject} = waiting.get(id)!;
    waiting.delete(id);
    if (response_type === 'resolve') {
        resolve(data);
    } else {
        reject(data);
    }
}

async function addMetadata(
    event: json_rpc_event,
    additional: event_data_t,
    id: number
) {
    if (typeof plugin.addMetadata === 'function') {
        const response = await plugin.addMetadata(event, additional);
        parentPort?.postMessage(['add_metadata', id, response]);
    }
}

parentPort?.on('message', async (args) => {
    const [method, ...others] = args;
    switch (method) {
        case 'load': {
            const additionalNodeModulesPath = path.join(
                pluginData.location,
                'node_modules'
            );
            if (fs.existsSync(additionalNodeModulesPath)) {
                module.paths.push(additionalNodeModulesPath);
            }

            plugin = require(pluginData.location) as FleetManagerPlugin;

            if (typeof plugin.load === 'function') {
                plugin.load({call, defineComponent});
            }

            parentPort?.postMessage(['load']);
            break;
        }
        case 'unload':
            if (typeof plugin.unload === 'function') {
                plugin.unload();
            }
            parentPort?.postMessage(['unload']);
            break;
        case 'on':
            if (typeof plugin.on === 'function') {
                plugin.on(others[0], others[1]);
            }
            break;

        case 'add_metadata':
            addMetadata(others[0], others[1], others[2]);
            break;

        case 'command_called':
            commandCalled(others);
            break;

        case 'commander_response':
            commanderResponse(others);
            break;
    }
});
