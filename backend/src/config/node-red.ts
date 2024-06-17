import * as runtime from '@node-red/runtime';
import fs from 'node:fs';
import path from 'node:path';
import { generateNodeRedToken } from '../model/User';
import { configRc } from '.';
import { getLogger } from 'log4js';
import { WebComponentConfig } from '../model/component/WebComponent';
const logger = getLogger('node-red-config');

export const NODE_RED_SETTINGS = {
    httpAdminRoot: '/node-red/red',
    httpNodeRoot: '/node-red/api',
    userDir: './cfg/node-red',
    functionGlobalContext: {}, // enables global context
    uiPort: 1880,
    uiHost: '0.0.0.0',
    flowFile: 'flows_fleetmanager.json',
} satisfies runtime.LocalSettings;

function generateFlows(config: WebComponentConfig) {
    return [
        {
            id: '18ba63a8c170d0f1',
            type: 'fleetmanager-config',
            access_token: generateNodeRedToken(),
        },
    ];
}

const setupPath = path.join(NODE_RED_SETTINGS.userDir, NODE_RED_SETTINGS.flowFile);

// wipe flag has been set
if (configRc['wipe-node-red']) {
    logger.warn('Wipe node-red flag set to TRUE, resetting flows');
    fs.rmSync(setupPath);
}

export function setup(config: WebComponentConfig) {
    if (!fs.existsSync(setupPath)) {
        fs.writeFileSync(setupPath, JSON.stringify(generateFlows(config)));
    }
}
