import path from 'node:path';
import { writeFile, readFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { CFG_FOLDER } from '.';

const COMPONENT_CONFIG_FOLDER = path.join(CFG_FOLDER, 'components');

function getCfgPath(component: string) {
    return path.join(
        path.join(COMPONENT_CONFIG_FOLDER, encodeURIComponent(component) + '.json')
    );
}

export function getConfigSync(
    componentName: string,
    defaultConfig: Record<string, any>
) {
    const cfgPath = getCfgPath(componentName);
    if (existsSync(cfgPath)) {
        let contents;
        try {
            contents = readFileSync(cfgPath, 'utf-8');
            return JSON.parse(contents);
        } catch (error) {
            console.error('failed to parse config', cfgPath, contents);
        }
    }
    return defaultConfig;
}

export async function getConfig(
    component: string,
    defaultConfig: Record<string, any>
) {
    const cfgPath = getCfgPath(component);
    if (existsSync(cfgPath)) {
        const contents = await readFile(cfgPath, 'utf-8');
        return JSON.parse(contents);
    }
    return defaultConfig;
}

export async function saveConfig(component: string, config: any) {
    const cfgPath = getCfgPath(component);
    return writeFile(cfgPath, JSON.stringify(config));
}
