import path from 'node:path';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import log4js from 'log4js';
const logger = log4js.getLogger('registry');

export const REGISTRY_FOLDER = path.join(__dirname, '../../cfg/registry');

function getRegistryPath(name: string) {
    return path.join(REGISTRY_FOLDER, name + '.json');
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

async function saveRegistry(
    name: string,
    content: any,
    backupFirst: boolean = false
) {
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

export async function addToRegistry(name: string, key: string, value: string) {
    const registry = await loadRegistry(name);
    registry[key] = value;
    return await saveRegistry(name, registry);
}

export async function removeFromRegistry(name: string, key: string) {
    const registry = await loadRegistry(name);
    delete registry[key];
    return await saveRegistry(name, registry);
}

export async function getFromRegistry(name: string, key: string) {
    const registry = await loadRegistry(name);
    return registry[key] || null;
}

export async function getRegistryKeys(name: string) {
    const registry = await loadRegistry(name);
    return Object.keys(registry);
}

export async function getAll(name: string) {
    return await loadRegistry(name);
}

// Make sure we always have -1 dashboard
export async function ensureDefaultDashboards() {
    const defaultDash = {
        name: 'My Dashboard',
        id: -1,
        items: [],
    };
    const ui = await getFromRegistry('ui', 'dashboards');
    if (ui == undefined) {
        await addToRegistry('ui', 'dashboards', { '-1': defaultDash } as any);
        return;
    }
    if (ui['-1'] == undefined) {
        ui['-1'] = defaultDash;
        await addToRegistry('ui', 'dashboards', ui);
    }
}
