import { defineStore, skipHydrate } from 'pinia';
import { computed, watch } from 'vue';
import { useLocalStorage } from '@vueuse/core';
import * as ws from '@/tools/websocket';
import * as http from '@/tools/http';
import { USE_LOGIN_ZITADEL } from '@/constants';
import zitadelAuth from '@/helpers/zitadelAuth';

export const useAuthStore = defineStore('auth', () => {
    const accessToken = useLocalStorage('access_token', '');
    const refreshToken = useLocalStorage('refresh_token', '');

    const loggedIn = computed(() => {
        if (USE_LOGIN_ZITADEL) {
            return !!(zitadelUser.value?.auth_time && zitadelUser.value.auth_time > 0);
        }
        console.log('Access token info:', accessTokenInfo.value);
        return (
            refreshToken.value.length > 0 &&
            refreshTokenInfo.value !== undefined &&
            typeof refreshTokenInfo.value.exp === 'number' &&
            new Date(refreshTokenInfo.value.exp * 1000) > new Date() &&
            // access token
            accessToken.value.length > 0 &&
            accessTokenInfo.value !== undefined &&
            typeof accessTokenInfo.value.exp === 'number' &&
            new Date(accessTokenInfo.value.exp * 1000) > new Date()
        );
    });

    const accessTokenInfo = computed(() => {
        try {
            if (accessToken.value == undefined) return undefined;
            return JSON.parse(atob(accessToken.value.split('.')[1]));
        } catch (e) {
            return undefined;
        }
    });

    const refreshTokenInfo = computed(() => {
        try {
            if (refreshToken.value == undefined) return undefined;
            return JSON.parse(atob(refreshToken.value.split('.')[1]));
        } catch (e) {
            return undefined;
        }
    });

    const username = computed(() => {
        return accessTokenInfo.value?.username;
    });

    const zitadelUser = computed(() => {
        try {
            if (USE_LOGIN_ZITADEL && zitadelAuth) {
                return zitadelAuth.oidcAuth.userProfile;
            }
            return undefined;
        } catch (error) {
            return undefined;
        }
    });

    async function handleLoginChanged(loggedIn: boolean) {
        if (loggedIn) {
            ws.connect();
        } else {
            accessToken.value = '';
            ws.close();
        }
    }

    function setTokens(refresh: string, access: string) {
        // track
        refreshToken.value = refresh;
        accessToken.value = access;
    }

    function logout() {
        localStorage.setItem('last_logout_time', String(new Date().getTime()));
        refreshToken.value = '';
        accessToken.value = '';
    }

    async function refreshAccessTokenIfNeeded() {
        if (refreshToken.value == undefined || refreshTokenInfo.value == undefined) {
            console.warn('no refresh token');
            return;
        }

        const now = Date.now();
        const refreshExpDate = new Date(refreshTokenInfo.value.exp * 1000);

        if (now > refreshExpDate.getTime()) {
            // refresh has expired, we have to login again
            refreshToken.value = undefined;
            return;
        }

        if (accessTokenInfo.value == undefined) {
            console.warn('no saved access token, refreshing');
            return await _refreshAccessToken();
        }

        const accessExpDate = new Date(accessTokenInfo.value.exp * 1000);
        const accessIatDate = new Date(accessTokenInfo.value.iat * 1000);

        const middle = new Date((accessExpDate.getTime() - accessIatDate.getTime()) / 2 + accessIatDate.getTime());

        if (now > middle.getTime()) {
            console.warn('access token passed middle, refreshing');
            return await _refreshAccessToken();
        }
    }

    async function _refreshAccessToken() {
        try {
            const resp = await http.refresh(refreshToken.value);
            if (typeof resp.access_token === 'string') {
                accessToken.value = resp.access_token;
            }
        } catch (error) {
            console.error('cannot refresh token', error);
        }
    }

    watch(
        loggedIn,
        (loggedIn) => {
            handleLoginChanged(loggedIn);
        },
        { immediate: true }
    );

    // initial call
    refreshAccessTokenIfNeeded();

    // check access token once every 6 hours
    setInterval(
        () => {
            refreshAccessTokenIfNeeded();
        },
        1000 * 60 * 60 * 6 /* 6 hours in ms */
    );

    return {
        accessToken: skipHydrate(accessToken),
        accessTokenInfo,
        refreshTokenInfo,
        username,
        loggedIn,
        setTokens,
        logout,
        handleLoginChanged,
        zitadelUser,
    };
});
