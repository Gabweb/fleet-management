/**
 * Module import order is important!
 * Importing the wrong module first, will enter into import loop and crash
 */
import dotenv from 'dotenv';
import * as log4js from 'log4js';
import * as PluginLoaderModule from './modules/PluginLoader';
import * as DeviceCollector from './modules/DeviceCollector';
import { start as startWeb } from './web';
import * as postgres from './modules/PostgresProvider';
import ShellyDeviceFactory from './model/ShellyDeviceFactory';
import * as Registry from './modules/Registry';

// ------------------------------------------------------------------------------------------------
// Configure
// ------------------------------------------------------------------------------------------------

dotenv.config();
log4js.configure({
    appenders: {
        console: { type: 'console' },
        defaultFile: { type: 'file', filename: 'logs/default.log' },
    },
    categories: {
        default: {
            appenders: ['console', 'defaultFile'],
            level: 'all',
        },
    },
});
const logger = log4js.getLogger();

// ------------------------------------------------------------------------------------------------
// Errors
// ------------------------------------------------------------------------------------------------

process.on('unhandledRejection', (reason, promise) => {
    logger.error('unhandledRejection', reason, promise);
}); // do nothing

process.on('uncaughtException', (reason, origin) => {
    logger.error('uncaughtException', reason, origin);
}); // do nothing

// Shutdown hooks
process.on('SIGINT', onShutdown);
process.on('SIGTERM', onShutdown);
process.on('SIGHUP', onShutdown);
process.on('SIGABRT', onShutdown);

function onShutdown() {
    logger.fatal('Shutting down...');
    DeviceCollector.getAll().forEach((shelly) => shelly.destroy());
    process.exit(0);
}

// ------------------------------------------------------------------------------------------------
// Start Fleet Manager
// ------------------------------------------------------------------------------------------------

async function main() {
    // Load plugins
    await Registry.ensureDefaultDashboards();
    await PluginLoaderModule.load();

    // load devices from db
    postgres.init((devices) => {
        logger.info('found %s saved devices', devices.length);
        let registered = 0;
        for (const external of devices) {
            // parse saved state to actual device object
            try {
                const device = ShellyDeviceFactory.fromDatabase(external.jdoc);
                if (device) {
                    DeviceCollector.register(device);
                    registered++;
                }
            } catch (error) {
                logger.warn(
                    'failed to load saved device state=[%s] err=[%s]',
                    JSON.stringify(external.jdoc),
                    String(error)
                );
            }
        }

        if (registered < devices.length) {
            logger.warn(
                'failed to load %s saved devices',
                devices.length - registered
            );
        }
    });

    // Start web server
    startWeb();
}

main();
