import path from 'node:path';
import { readdir, readFile, stat, symlink, unlink } from 'node:fs/promises';
import { watch, existsSync } from 'node:fs';
import log4js from 'log4js';
import { Worker } from 'worker_threads';
import * as Commander from '../modules/Commander';
import PluginComponent from '../model/component/PluginComponent';
import { event_data_t, json_rpc_event, PluginData, PluginInfo } from '../types';
import { PLUGINS_FOLDER } from '../config';
import { rebuild as rebuildFrontend } from './Frontend';

const logger = log4js.getLogger('Plugin Loader');

const pluginDataMap = new Map<string, PluginData>();
const plugins = new Map<string, Worker>();
// METADATA
let metadata_id = 0;
const metadataWaiting = new Map<number, { resolve: Function; reject: Function }>();
const COMMAND_SENDER_PLUGIN: Commander.CommandSender = {
    permissions: ['*'],
    group: 'plugins',
};

// ----------------------------------------------------------------------------------
// Looking for plugins
// ----------------------------------------------------------------------------------

async function scanDirEntry(entry: string) {
    // .gitkeep is not a plugin
    if (entry === '.gitkeep') return;
    try {
        const pluginFolder = path.join(PLUGINS_FOLDER, entry);
        const pluginInfo = JSON.parse(
            (await readFile(path.join(pluginFolder, 'package.json'))).toString(
                'utf8'
            )
        );
        // Check if pluginInfo(package.json) has all the required information
        if (!isPluginInfo(pluginInfo)) {
            throw new Error(
                `Invalid data format in 'package.json' in '${pluginFolder}'.`
            );
        }

        if (pluginRegistered(pluginInfo.name)) {
            throw new Error('Plugin already loaded');
        }

        pluginInfo.name =
            (pluginInfo.name.startsWith('@') && pluginInfo.name.split('/').at(-1)) ||
            pluginInfo.name;

        return { pluginInfo, pluginFolder };
    } catch (e) {
        logger.error('General load error', e);
        return undefined;
    }
}

async function scan() {
    let dir: string[] = [];
    try {
        dir = await readdir(PLUGINS_FOLDER);
    } catch (e) {
        logger.warn('PluginLoadFail', e);
    }
    const entries = await Promise.all(dir.map(scanDirEntry));
    return entries.filter(Boolean) as {
        pluginInfo: PluginInfo;
        pluginFolder: string;
    }[];
}

/**
 * Which plugin to load and which to remove
 * removes same records in both arrays
 * rest is separated in add, remove ... what to add and what to remove
 */
function addRem(newPlugins: string[], oldPlugins: string[]) {
    return newPlugins.reduce<{ add: string[]; remove: string[] }>(
        ({ add, remove }, c: string) => {
            const removeIndex = remove.indexOf(c);
            if (removeIndex >= 0) {
                return {
                    add,
                    remove: remove
                        .slice(0, removeIndex)
                        .concat(remove.slice(removeIndex + 1)),
                };
            }
            return {
                add: add.concat(c),
                remove,
            };
        },
        { add: [], remove: oldPlugins }
    );
}

async function sync() {
    const existing = await scan();
    const acexist = Array.from(pluginDataMap.values()).map((i) => i.info.name);
    const acnew = existing.map((i) => i.pluginInfo.name);
    const { add, remove } = addRem(acnew, acexist);

    const comps = Commander.getComponents();

    for (const val of add) {
        const p = existing.find((v) => v!.pluginInfo.name === val);
        if (!p) continue;
        pluginDataMap.set(p.pluginInfo.name, {
            location: p.pluginFolder,
            info: p.pluginInfo,
        });

        const name = p!.pluginInfo.name;
        const component = new PluginComponent(name);
        Commander.registerComponent(component);
        const config = component.getConfig();
        if (config.enable === true) {
            await enablePlugin(name);
        }
    }

    for (const name of remove) {
        const component = new PluginComponent(name);
        comps.delete(component.name);
        pluginDataMap.delete(name);
        const config = component.getConfig();
        if (config.enable === false) {
            disablePlugin(name);
        }
    }
}

// ----------------------------------------------------------------------------------
// Plugin interactions
// ----------------------------------------------------------------------------------

export function listPlugins() {
    return Object.fromEntries(pluginDataMap.entries());
}

export function notifyEvent(event: json_rpc_event, eventData?: event_data_t) {
    for (const pluginWorker of plugins.values()) {
        pluginWorker.postMessage(['on', event, eventData]);
    }
}

export async function sendForMetadata(
    event: json_rpc_event,
    eventData: event_data_t
) {
    for (const [name, worker] of plugins.entries()) {
        const config = pluginDataMap.get(name);
        if (config == undefined) continue;
        const metadata = config.info.config?.metadata;
        if (metadata != undefined && typeof metadata === 'boolean' && metadata) {
            // we found a preprocessor
            const currentID = metadata_id;
            metadata_id = metadata_id + 1;
            // send JSON version of device
            const sendData = {
                ...eventData,
                device: eventData.device?.toJSON(),
            };
            worker.postMessage(['add_metadata', event, sendData, currentID]);
            const response: any = await new Promise((resolve, reject) => {
                metadataWaiting.set(currentID, { resolve, reject });
            });
            if (response) {
                event.params.metadata = {
                    ...event.params.metadata,
                    ...response,
                };
            }
        }
    }
    return event;
}

// ----------------------------------------------------------------------------------
// Loading & Unloading
// ----------------------------------------------------------------------------------

export async function enablePlugin(name: string, buildFrontend = true) {
    logger.mark('starting enablePlugin for', name);
    if (!pluginDataMap.has(name)) {
        return false;
    }
    const pluginData = pluginDataMap.get(name)!;

    // Handle menu items
    const menuItems = pluginData.info.config?.menuItems;
    if (menuItems) {
        await addMenuItems(menuItems);
    }

    // Handle frontend
    if (buildFrontend) {
        // do not wait for the build
        buildFrontendIfNeeded(name).then(
            () => {
                // TODO: send event for reload
            },
            (err) => {
                logger.error("Failed to build frontend for plugin '%s'", name, err);
            }
        );
    }
    // Register plugin worker w/ events
    const worker = new Worker(__dirname + '/../controller/plugin/worker.js', {
        workerData: pluginData,
    });

    worker.postMessage(['load']);

    let commandId = 0;
    const waiting: Map<number, { resolve: Function; reject: Function }> = new Map();
    worker.on('message', async (args) => {
        const [method, ...params] = args;
        switch (method) {
            case 'load':
                plugins.set(pluginData.info.name, worker);
                break;
            case 'unload':
                plugins.delete(pluginData.info.name);
                break;

            case 'register_component': {
                const [name, ...methods] = params;
                // console.log("register_component ", ...params);

                const methodsMap: Map<
                    string,
                    (params: any, sender: any) => Promise<any>
                > = new Map();
                for (const method of methods) {
                    methodsMap.set(
                        method,
                        (params, sender) =>
                            new Promise((resolve, reject) => {
                                delete sender.additional; // not serializable
                                // console.log('plugin forwarding', name, method, params, sender)
                                worker.postMessage([
                                    'command_called',
                                    commandId,
                                    name,
                                    method,
                                    params,
                                    sender,
                                ]);
                                waiting.set(commandId, { resolve, reject });
                                commandId++;
                            })
                    );
                }

                Commander.registerComponentFromPlugin(name, methodsMap);
                break;
            }

            case 'command_response': {
                const [id, response_type, data] = params;
                // console.log({ id, response_type, data })
                const { resolve, reject } = waiting.get(id)!;
                if (response_type === 'resolve') {
                    resolve(data);
                } else {
                    reject(data);
                }
                break;
            }

            case 'call_commander': {
                const [call_id, method, pass_params] = params;
                // console.log("commander called", call_id, method, pass_params)
                try {
                    const res = await Commander.exec(
                        COMMAND_SENDER_PLUGIN,
                        method,
                        pass_params
                    );
                    worker.postMessage([
                        'commander_response',
                        call_id,
                        'resolve',
                        res,
                    ]);
                } catch (err) {
                    worker.postMessage([
                        'commander_response',
                        call_id,
                        'reject',
                        err,
                    ]);
                }
                break;
            }
            case 'add_metadata': {
                const [metadata_id, metadata] = params;
                const metadataPromise = metadataWaiting.get(metadata_id);
                if (metadataPromise) {
                    metadataPromise.resolve(metadata);
                }
                break;
            }
        }
    });

    return true;
}

export function disablePlugin(name: string) {
    if (!pluginDataMap.has(name)) {
        return false;
    }
    const pluginData = pluginDataMap.get(name)!;
    const pluginWorker = plugins.get(pluginData.info.name);

    // Remove menu items if needed
    const menuItems = pluginData.info.config?.menuItems;
    if (menuItems) {
        removeMenuItems(menuItems);
    }

    if (pluginWorker == undefined) {
        logger.mark('no plugin worker active for %s', name);
        return false;
    }

    pluginWorker.postMessage(['unload']);

    // Do not leave plugin running in background
    // Law-abiding plugins should terminate on unload, but this won't hurt
    setTimeout(() => {
        logger.mark('terminating plugin worker for %s', name);
        pluginWorker.terminate();
    }, 100);

    removeFrontendIfNeeded(name);
    return true;
}

// ----------------------------------------------------------------------------------
// Frontend
// ----------------------------------------------------------------------------------

async function addMenuItems(items: any[]) {
    const menuItems = await Commander.execInternal('Storage.GetItem', {
        registry: 'ui',
        key: 'menuItems',
    });
    if (menuItems == undefined) {
        await Commander.execInternal('Storage.SetItem', {
            registry: 'ui',
            key: 'menuItems',
            value: items,
        });
        return;
    }
    // Add alongside others
    const newItems = [...menuItems];
    for (const item of items) {
        if (newItems.some((i) => JSON.stringify(item) === JSON.stringify(i))) {
            // We already have this added
            continue;
        }
        newItems.push(item);
    }

    return await Commander.execInternal('Storage.SetItem', {
        registry: 'ui',
        key: 'menuItems',
        value: newItems,
    });
}

async function removeMenuItems(items: any[]) {
    const menuItems = await Commander.execInternal('Storage.GetItem', {
        registry: 'ui',
        key: 'menuItems',
    });
    if (menuItems == undefined) {
        return;
    }
    // remove
    const newItems = [];
    for (const item of items) {
        if (menuItems.some((i: any) => JSON.stringify(item) === JSON.stringify(i))) {
            // Do not add to the copy
            continue;
        }
        newItems.push(item);
    }

    return Commander.execInternal('Storage.SetItem', {
        registry: 'ui',
        key: 'menuItems',
        value: newItems,
    });
}

function getSrcDestPaths(plugin: string) {
    return {
        source: path.join(__dirname, '../../../', 'plugins', plugin, 'frontend'),
        dest: path.join(
            __dirname,
            '../../../',
            'frontend',
            'src/pages',
            'plugin',
            plugin
        ),
    };
}

async function buildFrontendIfNeeded(plugin: string) {
    const { source, dest } = getSrcDestPaths(plugin);

    if (!existsSync(source) || existsSync(dest)) {
        // no frontend to build, do nothing
        return;
    }
    // this will throw if the file does not exist
    await stat(path.join(dest, '../'));
    // hard links are not allowed for directories
    await symlink(source, dest);

    // Rebuild frontend
    rebuildFrontend();
}

async function removeFrontendIfNeeded(plugin: string) {
    const { dest } = getSrcDestPaths(plugin);
    if (!existsSync(dest)) {
        // no frontend to remove, do nothing
        return;
    }

    //remove symlink
    await unlink(dest);

    // Rebuild frontend
    rebuildFrontend();
}

// ----------------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------------

function pluginRegistered(name: string) {
    for (const data of pluginDataMap.values()) {
        if (data.info.name == name) return true;
    }

    return false;
}

function isPluginInfo(pluginInfo: any): pluginInfo is PluginInfo {
    return (
        typeof pluginInfo === 'object' &&
        typeof pluginInfo.name === 'string' &&
        typeof pluginInfo.version === 'string' &&
        typeof pluginInfo.description === 'string'
    );
}

// ----------------------------------------------------------------------------------
// Initial call
// ----------------------------------------------------------------------------------

export async function load() {
    await sync();
    try {
        watch(PLUGINS_FOLDER, sync);
    } catch (e) {
        logger.warn('PluginLoadFail', e);
    }
}
