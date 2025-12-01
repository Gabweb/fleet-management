import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import log4js from 'log4js';
const logger = log4js.getLogger('registry');
import {callMethod} from './PostgresProvider';

const actions = {
    'ui.dashboards': {
        async add({name, items}: {name: string; items: string[]}) {
            const {
                rows: [{fn_dashboard_add: dash}]
            } = await callMethod('ui.fn_dashboard_add', {p_name: name});
            if (items.length) {
                await callMethod('ui.fn_dashboard_item_add', {
                    p_dashboard: dash,
                    p_type: 0,
                    p_item: 0,
                    p_order: 0,
                    p_sub_item: 0
                });
            }
            return await actions['ui.dashboards'].fetch();
        },
        async update({
            name,
            items,
            id
        }: {
            name: string;
            items: string[];
            id: number;
        }) {
            await callMethod('ui.fn_dashboard_update', {
                p_name: name,
                p_id: id
            });
            if (items?.length) {
                await callMethod('ui.fn_dashboard_item_update', {
                    p_dashboard: id,
                    p_type: 0,
                    p_item: 0,
                    p_order: 0,
                    p_sub_item: 0
                });
            }
            return await actions['ui.dashboards'].fetch();
        },
        async remove({id}: {id: number}) {
            await callMethod('ui.fn_dashboard_remove', {p_id: id});
            return await actions['ui.dashboards'].fetch();
        },
        async fetch() {
            const {rows} = await callMethod('ui.fn_dashboard_fetch', {});
            return Promise.all(
                rows.map(
                    async (d: {
                        name: string;
                        id: number;
                        items: {type: string; id: number}[];
                    }) => {
                        const {rows: items} = await callMethod(
                            'ui.fn_dashboard_item_fetch',
                            {p_id: d.id}
                        );
                        d.items = items;
                        return d;
                    }
                )
            );
        }
    },
    'ui.menuItems': {
        async fetch() {
            const {rows} = await callMethod('ui.fn_menuitem_fetch', {});
            return rows.map(
                (r: {
                    id: number;
                    name: string;
                    url: string;
                    icon_path: string;
                }) => ({
                    id: r.id.toString(),
                    name: r.name,
                    link: r.url,
                    icon: r.icon_path
                })
            );
        },

        async add({
            name,
            link,
            icon
        }: {
            name: string;
            link: string;
            icon: string;
        }) {
            const {
                rows: [{fn_menuitem_add: newId}]
            } = await callMethod('ui.fn_menuitem_add', {
                p_name: name,
                p_url: link,
                p_icon_path: icon
            });
            return this.fetch();
        },

        async update({
            id,
            name,
            link,
            icon
        }: {
            id: number;
            name: string;
            link: string;
            icon: string;
        }) {
            await callMethod('ui.fn_menuitem_update', {
                p_id: id,
                p_name: name,
                p_url: link,
                p_icon_path: icon
            });
            return this.fetch();
        },

        async remove({link}: {link: string}) {
            await callMethod('ui.fn_menuitem_remove', {p_url: link});
            return this.fetch();
        }
    },
    'ui.config': {
        async fetch() {
            const {rows} = await callMethod('ui.fn_config_fetch', {});
            return rows;
        }
    },

    'actions.rpc': {
        async fetch() {
            const {rows} = await callMethod(
                'ui.fn_dashboard_item_action_fetch',
                {}
            );
            return rows.map((r: {id: number; name: string; udf: any}) => ({
                id: r.id.toString(),
                name: r.name,
                type: 'action' as const,
                actions: r.udf
            }));
        },
        async add({name, actions: udf}: {name: string; actions: any[]}) {
            await callMethod('ui.fn_dashboard_item_action_add', {
                p_name: name,
                p_udf: udf
            });
            return this.fetch();
        },
        async update({
            id,
            name,
            actions: udf
        }: {
            id: number;
            name: string;
            actions: any[];
        }) {
            await callMethod('ui.fn_dashboard_item_action_update', {
                p_id: id,
                p_name: name,
                p_udf: udf
            });
            return this.fetch();
        },
        async remove({id}: {id: number}) {
            await callMethod('ui.fn_dashboard_item_action_remove', {p_id: id});
            return this.fetch();
        }
    }
} as Record<string, any>;

export const REGISTRY_FOLDER = path.join(__dirname, '../../cfg/registry');

function getRegistryPath(name: string) {
    // eslint-disable-next-line no-useless-escape
    const safe = name.replace(/[:\/\\]/g, '_');
    return path.join(REGISTRY_FOLDER, `${safe}.json`);
}

function registryExists(path: string) {
    return (
        fs.existsSync(REGISTRY_FOLDER) &&
        fs.statSync(REGISTRY_FOLDER).isDirectory() &&
        fs.existsSync(path)
    );
}

async function loadRegistry(name: string): Promise<Record<string, any>> {
    const registryPath = getRegistryPath(name);
    if (!registryExists(registryPath)) {
        logger.warn('registry %s not found', name);
        return {};
    }
    try {
        const contents = await fsPromises.readFile(registryPath, 'utf-8');
        const registry = JSON.parse(contents);
        if (typeof registry === 'object') {
            return registry;
        }
    } catch (error) {
        logger.warn('registry %s cannot be parsed', name, error);
        try {
            await saveRegistry(name, {}, true);
        } catch (e) {
            logger.warn('registry %s cannot be parsed', name, error);
        }
        return {};
    }

    logger.warn('registry %s is of the wrong format', name);
    return {};
}

async function saveRegistry(name: string, content: any, backupFirst = false) {
    const registryPath = getRegistryPath(name);
    if (backupFirst) {
        try {
            await fsPromises.rename(
                registryPath,
                `${registryPath}.${Date.now()}.back`
            );
        } catch (error) {
            logger.warn('failed to rename registry %s', name, error);
        }
    }
    return await fsPromises.writeFile(
        registryPath,
        JSON.stringify(content, undefined, 4),
        'utf-8'
    );
}

export async function addToRegistry(
    name: string,
    key: string,
    value: NonNullable<any>
) {
    const cc: string = `${name}.${key}`;
    if (actions[cc]) {
        const act = actions[cc];
        if (!value.id) {
            return await act.add(value);
        }
        return await act.update(value);
    }
    const data = await loadRegistry(name);
    data[key] = value;
    await saveRegistry(name, data);
    return data;
}

export async function removeFromRegistry(
    name: string,
    key: string,
    value: NonNullable<any>
) {
    const cc: string = `${name}.${key}`;

    if (actions[cc]) {
        if (!value) throw new Error('Missing arguments');
        const rr = await actions[cc].remove(value);
        return rr;
    }
    const data = await loadRegistry(name);
    delete data[key];
    await saveRegistry(name, data);
    return data;
}

export async function getFromRegistry(name: string, key: string) {
    const cc: string = `${name}.${key}`;

    if (actions[cc]) {
        const rr = await actions[cc].fetch();
        return rr;
    }
    const data = await loadRegistry(name);
    return data[key] ?? null;
}

export async function getRegistryKeys(name: string) {
    const registry = await loadRegistry(name);
    return Object.keys(registry);
}

export async function getAll(name: string) {
    return await loadRegistry(name);
}

export async function addDashboardItem(
    dashboard: number,
    type: number,
    item: number,
    order = 0,
    sub_item: string | null = null
): Promise<number> {
    const {
        rows: [{fn_dashboard_item_add: id}]
    } = await callMethod('ui.fn_dashboard_item_add', {
        p_dashboard: dashboard,
        p_type: type,
        p_item: item,
        p_order: order,
        p_sub_item: sub_item
    });
    return id;
}

export async function removeDashboardWidget(
    dashboard: number,
    itemId: number
): Promise<void> {
    await callMethod('ui.fn_dashboard_item_remove', {
        p_dashboard: dashboard,
        p_dashboard_item: itemId
    });
}

export async function getUIConfig(): Promise<any[]> {
    const config = await actions['ui.config'].fetch();
    return config;
}
