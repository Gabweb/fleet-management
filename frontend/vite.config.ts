import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from "url";
import VueRouter from 'unplugin-vue-router/vite';
import { execSync } from 'child_process';
import fs from "node:fs";
import path from "node:path";

function tryFile(path: string) {
    console.debug("trying rc file: ", path);
    try {
        if (fs.existsSync(path)) {
            // check read permissions, will throw if not allowed
            fs.accessSync(path, fs.constants.R_OK);
            const parsed = JSON.parse(fs.readFileSync(path, 'utf-8'));
            return parsed?.oidc?.frontend;
        }
    } catch (error) {
        return undefined;
    }
}

function parseRcConfig() {
    let currentPath = import.meta.dirname || __dirname;

    console.log({ currentPath})

    const RETRIES = 3;
    for(let i = 0; i < RETRIES; i++){
        const config = tryFile(path.join(currentPath, '.fleet-managerrc'));
        if(config) return config;
        // move to up directory and continue;
        currentPath = path.join(currentPath, '..');
    }

    return {};
}

// https://vitejs.dev/config/
export default defineConfig({
    clearScreen: false,
    plugins: [VueRouter(), vue()],
    resolve: {
        alias: [
            { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
        ],
    },
    define: {
        'NPM_APP_VERSION': JSON.stringify(process.env.npm_package_version),
        'GIT_COMMIT_HASH': JSON.stringify(execSync('git rev-parse --short HEAD || echo ""').toString()),
        'GIT_BRANCH_NAME': JSON.stringify(execSync('git rev-parse --abbrev-ref HEAD || echo ""').toString().trim()),
        'GIT_LAST_COMMIT_TIME': JSON.stringify(execSync("git log -1 --pretty='format:%cd' --date=format:'%Y-%m-%d %H:%M:%S' || echo \"\"").toString()),
        'OIDC_CONFIG': JSON.stringify(parseRcConfig())
    }
})