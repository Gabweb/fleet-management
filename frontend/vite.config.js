import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'url';
import VueRouter from 'unplugin-vue-router/vite';
import { execSync } from 'child_process';
import fs from 'node:fs';
import path from 'node:path';
import { VitePWA } from 'vite-plugin-pwa';
function tryFile(path) {
    var _a;
    console.debug('trying rc file: ', path);
    try {
        if (fs.existsSync(path)) {
            // check read permissions, will throw if not allowed
            fs.accessSync(path, fs.constants.R_OK);
            var parsed = JSON.parse(fs.readFileSync(path, 'utf-8'));
            return (_a = parsed === null || parsed === void 0 ? void 0 : parsed.oidc) === null || _a === void 0 ? void 0 : _a.frontend;
        }
    }
    catch (error) {
        return undefined;
    }
}
function parseRcConfig() {
    var currentPath = import.meta.dirname || __dirname;
    console.log({ currentPath: currentPath });
    var RETRIES = 3;
    for (var i = 0; i < RETRIES; i++) {
        var config = tryFile(path.join(currentPath, '.fleet-managerrc'));
        if (config)
            return config;
        // move to up directory and continue;
        currentPath = path.join(currentPath, '..');
    }
    return {};
}
// https://vitejs.dev/config/
export default defineConfig({
    clearScreen: false,
    plugins: [
        VueRouter(),
        vue(),
        VitePWA({
            registerType: 'autoUpdate',
            manifest: {
                name: 'Shelly Fleet Manager',
                short_name: 'Fleet Manager',
                description: 'Fleet Manager is a standalone software for controlling and monitoring new generations of Shelly devices.',
                theme_color: '#141D4D',
                icons: [
                    {
                        src: '/pwa-192x192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'any',
                    },
                    {
                        src: '/pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any',
                    },
                    {
                        src: '/pwa-maskable-192x192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'maskable',
                    },
                    {
                        src: '/pwa-maskable-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable',
                    },
                ],
                start_url: '/',
                display: 'standalone',
                background_color: '#283992',
            },
            workbox: {
                navigateFallbackDenylist: [/node-red/i, /grafana/i, /rpc/i, /alexa/i],
            },
        }),
    ],
    resolve: {
        alias: [{ find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) }],
    },
    define: {
        NPM_APP_VERSION: JSON.stringify(process.env.npm_package_version),
        GIT_COMMIT_HASH: JSON.stringify(execSync('git rev-parse --short HEAD || echo ""').toString()),
        GIT_BRANCH_NAME: JSON.stringify(execSync('git rev-parse --abbrev-ref HEAD || echo ""').toString().trim()),
        GIT_LAST_COMMIT_TIME: JSON.stringify(execSync("git log -1 --pretty='format:%cd' --date=format:'%Y-%m-%d %H:%M:%S' || echo \"\"").toString()),
        OIDC_CONFIG: JSON.stringify(parseRcConfig()),
    },
});
