import fs from 'node:fs';
import path from 'node:path';
import type * as runtime from '@node-red/runtime';
import {getLogger} from 'log4js';
import {configRc} from '.';
const logger = getLogger('node-red-config');

export const NODE_RED_SETTINGS = {
    httpAdminRoot: '/node-red/red',
    httpNodeRoot: '/node-red/api',
    // This can used to debug, change the value to yuor local node-red
    userDir: './cfg/node-red', // ex. '/home/ubuntu/.node-red'
    functionGlobalContext: {}, // enables global context
    uiPort: 1880,
    logging: {
        console: {
            level: 'error',
            metrics: false,
            audit: false
        }
    },
    uiHost: '0.0.0.0',
    flowFile: 'flows_fleetmanager.json'
} satisfies runtime.LocalSettings;

const setupPath = path.join(
    NODE_RED_SETTINGS.userDir,
    NODE_RED_SETTINGS.flowFile
);

function writeDefaultFlows() {
    const defaultFlows = [
        {
            id: '18ba63a8c170d0f1',
            type: 'fleetmanager-config'
        }
    ];

    fs.writeFileSync(setupPath, JSON.stringify(defaultFlows));
    logger.info('Wrote node-red config');
}

// wipe flag has been set
if (configRc['wipe-node-red']) {
    logger.warn('Wipe node-red flag set to TRUE, resetting flows');
    fs.rmSync(setupPath);
}

export function setup() {
    if (!fs.existsSync(setupPath)) {
        writeDefaultFlows();
    }
}
