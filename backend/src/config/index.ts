import { getLogger } from 'log4js';
import { ZitadelIntrospectionOptions } from 'passport-zitadel';
import path from 'node:path';
import fs from 'node:fs';
import rc from 'rc';
const logger = getLogger('config');

export const CFG_FOLDER =
    process.env['CONFIG_FOLDER'] || path.join(__dirname, '../../cfg');
export const PLUGINS_FOLDER =
    process.env['PLUGINS_FOLDER'] || path.join(__dirname, '../../plugins');

interface config_rc_t {
    oidc?: {
        backend: ZitadelIntrospectionOptions;
        frontend: {};
    };
    components: {
        group?: Record<string, object>;
        mail?: Record<string, object>;
        mdns?: Record<string, object>;
        storage?: Record<string, object>;
        user?: Record<string, object>;
        web?: {
            relativeClientPath: string;
            port: number;
            port_ssl: number;
            https_crt: string;
            https_key: string;
            jwt_token: string;
        };
    };
    internalStorage?: {
        connection: Record<string, unknown>;
        schema: string;
        cwd: string[];
        link: any;
    };
    'wipe-components': boolean;
    'wipe-node-red': boolean;
}
export const configRc: config_rc_t = rc<config_rc_t>('fleet-manager', {
    'wipe-components': false,
    'wipe-node-red': false,
    internalStorage: {
        connection: {},
        schema: 'migration',
        cwd: ['./db/migration/postgresql'],
        link: {
            schemas: ['devices', 'core'],
        },
    },
    components: {
        web: {
            port: 7011,
            port_ssl: -1,
            https_crt: '/path/to/cert.crt',
            https_key: '/path/to/cert.key',
            jwt_token: 'shelly-secret-token',
            relativeClientPath: '../../../frontend/dist',
        },
    },
});

logger.info('RC Config', JSON.stringify(configRc, null, 4));

// wipe flag has been set
if (configRc['wipe-components']) {
    logger.warn('Wipe components flag set to TRUE, resetting everything');

    let count = 0;
    for (const file of fs.readdirSync(path.join(CFG_FOLDER, 'components'))) {
        if (file.startsWith('.')) continue;
        fs.rmSync(path.join(CFG_FOLDER, 'components', file));
        count++;
    }

    logger.warn('DELETED %s configs ', count);
}

export const loginStrategy = getLoginStrategy();
logger.info('LOGIN_STRATEGY:[%s]', loginStrategy);

function getLoginStrategy() {
    if (configRc.oidc && configRc.oidc.backend) {
        return 'zitadel-introspection';
    }

    return 'backend-jwt';
}
