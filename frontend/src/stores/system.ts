import { defineStore, skipHydrate } from 'pinia';
import * as ws from '@/tools/websocket';
import { computed, ref, watch } from 'vue';
import { useLocalStorage } from '@vueuse/core';
import * as websocket from '@/tools/websocket';
import zitadelAuth from '@/helpers/zitadelAuth';
import { USE_LOGIN_ZITADEL } from '@/constants';

export const useSystemStore = defineStore('system', () => {
    const config = ref({
        ble: false,
        mdns: { enable: false },
    });

    const localToken = useLocalStorage('fleet-management-token', '');

    const decodedToken = computed(() => {
        try {
            if (USE_LOGIN_ZITADEL && zitadelAuth) {
                return zitadelAuth.oidcAuth.userProfile;
            }
            return JSON.parse(atob(localToken.value.split('.')[1]));
        } catch (error) {
            return undefined;
        }
    });

    const loggedIn = computed(() => {
        if (USE_LOGIN_ZITADEL) {
            return decodedToken.value.auth_time > 0;
        } else {
            if (
                localToken.value.length == 0 ||
                decodedToken.value == undefined ||
                typeof decodedToken.value.exp !== 'number'
            ) {
                return false;
            }

            return Number(decodedToken.value.exp) > Date.now() / 1000;
        }
    });

    async function updateConfig() {
        try {
            config.value = await ws.getServerConfig();
        } catch (error) {
            console.error('failed to get server config');
        }
    }

    watch(
        loggedIn,
        () => {
            if (loggedIn.value) {
                updateConfig();
                websocket.connect();
            } else {
                websocket.close();
            }
        },
        { immediate: true }
    );

    return {
        token: skipHydrate(localToken),
        config,
        loggedIn,
        updateConfig,
        decodedToken,
    };
});
