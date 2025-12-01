import * as child_process from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import util from 'node:util';
import {getLogger} from 'log4js';

const logger = getLogger('frontend-builder');

const FRONTEND_FOLDER = path.join(__dirname, '../../../frontend');
const FRONTEND_PACKAGE_JSON = path.join(FRONTEND_FOLDER, 'package.json');
const FRONTEND_BUILD_ENV: Record<string, string> = {};

const exec = util.promisify(child_process.exec);

let building = false;

export function getConfig() {
    if (
        !fs.existsSync(FRONTEND_FOLDER) ||
        !fs.existsSync(FRONTEND_PACKAGE_JSON)
    ) {
        throw new Error(`Cannot find frontend @ ${FRONTEND_FOLDER}`);
    }

    let packageJson: any;
    try {
        packageJson = JSON.parse(
            fs.readFileSync(FRONTEND_PACKAGE_JSON, 'utf-8')
        );
    } catch {
        throw new Error(`Cannot parse package.json @${FRONTEND_PACKAGE_JSON}`);
    }

    if (
        typeof packageJson !== 'object' ||
        packageJson.name !== '@fleet-management/frontend'
    ) {
        throw new Error('Non Fleet-manager frontend');
    }

    return packageJson;
}

export function setEnv(item: string, value: string) {
    FRONTEND_BUILD_ENV[item] = value.replaceAll('-', '_');
}

export function delEnv(item: string) {
    delete FRONTEND_BUILD_ENV[item];
}

export async function rebuild() {
    if (building) {
        throw new Error('Already building frontend');
    }
    building = true;
    const frontendConfig = getConfig();
    if (frontendConfig.error) {
        logger.error('rebuild FE error', frontendConfig.error);
        return frontendConfig;
    }

    logger.mark('frontend build env', FRONTEND_BUILD_ENV);

    const cmd = 'npm i --legacy-peer-deps && npm run build';
    try {
        const {stdout, stderr} = await exec(cmd, {
            cwd: FRONTEND_FOLDER,
            env: {
                ...process.env,
                ...FRONTEND_BUILD_ENV
            }
        });

        logger.mark('build stdout:', stdout);
        logger.mark('build stderr:', stderr);
    } catch (error) {
        logger.mark('failed executing cmd:[%s]', cmd, error);
    } finally {
        building = false;
    }

    // TODO: send event to frontend
}
