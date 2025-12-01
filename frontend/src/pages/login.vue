<template>
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xs">
        <div
            class="bg-slate-800 border border-slate-600 shadow-md rounded px-8 pt-6 pb-8 mb-4 flex flex-col gap-4"
            @keyup.enter="login"
        >
            <img src="https://control.shelly.cloud/images/shelly-logo.svg" width="112" height="28" class="m-auto" />
            <h2 class="text-2xl font-semibold text-center text-gray-200">Fleet Manager</h2>
            <Input id="username" v-model="username" label="Username" type="text" placeholder="username" />
            <Input id="password" v-model="password" label="Password" type="password" placeholder="*****" />
            <Button type="blue" @click="login">Sign In</Button>
            <template v-if="zitadelAuth">
                <hr />
                <Button type="red" @click="loginExternal">Login External</Button>
            </template>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onBeforeMount, ref } from 'vue';
import * as http from '@/tools/http';
import { useToastStore } from '@/stores/toast';
import { useAuthStore } from '@/stores/auth';
import Input from '@/components/core/Input.vue';
import Button from '@/components/core/Button.vue';
import { useRouter } from 'vue-router/auto';
import zitadelAuth from '@/helpers/zitadelAuth';

const username = ref('');
const password = ref('');
const toast = useToastStore();
const router = useRouter();
const authStore = useAuthStore();

function loginExternal() {
    if (zitadelAuth) {
        zitadelAuth.oidcAuth.signIn({
            extraTokenParams: {
                'Access-Control-Allow-Credentials': true,
                'Access-Control-Allow-Methods': '*',
                'Access-Control-Allow-Origin': '*',
            },
        });
    }
}

async function login() {
    try {
        const resp = await http.login(username.value, password.value);
        const { access_token, refresh_token } = resp;
        if([access_token, refresh_token].includes(undefined)){
            throw new Error("Invalid username or password")
        }
        authStore.setTokens(refresh_token, access_token);
        toast.success('Logged in');
        router.push('/');
    } catch (error) {
        console.error(error);
        toast.error('Incorrect username or password');
    }
}

onBeforeMount(() => {
    if (authStore.loggedIn) {
        useRouter().push('/');
    }
});
</script>
