<template>
    <div class="space-y-2">
        <BasicBlock darker title="User Info">
            <div class="flex flex-row flex-nowrap mt-2">
                <figure class="w-16 h-16 rounded-full overflow-hidden">
                    <img src="/shelly_logo_black.jpg" />
                </figure>
                <div v-if="USE_LOGIN_ZITADEL" class="ml-3 flex flex-col gap-1">
                    <p>
                        <span>{{ decodedToken.name }}</span>
                        <span class="text-gray-600"> ({{ decodedToken.nickname }})</span>
                    </p>
                    <span class="text-gray-500 text-xs"> {{ decodedToken.email }}</span>
                    <Button size="sm" type="blue" class="w-20" @click="logout">Sign out</Button>
                </div>

                <div v-else class="ml-3 flex flex-col justify-around">
                    <span>{{ decodedToken?.username }}</span> <br />
                    <Button size="sm" type="blue" class="w-20" @click="logout">Log out</Button>
                </div>
            </div>
        </BasicBlock>
        <BasicBlock darker title="Edit user info">
            <Collapse title="Change password">
                <Notification v-if="USE_LOGIN_ZITADEL" type="warning">
                    Your account is externally managed.
                </Notification>
                <div v-else class="flex flex-row gap-2">
                    <Input v-model="changePasswordData.oldPassword" type="text" placeholder="Current password" />
                    <Input v-model="changePasswordData.newPassword" type="text" placeholder="New password" />
                    <Button narrow size="sm" :disabled="disabledSaveButton" @click="changePassword"> Save </Button>
                </div>
            </Collapse>
        </BasicBlock>
    </div>
</template>

<script setup lang="ts">
import { useSystemStore } from '@/stores/system';
import BasicBlock from '@/components/core/BasicBlock.vue';
import { storeToRefs } from 'pinia';
import Button from '@/components/core/Button.vue';
import { useRouter } from 'vue-router/auto';
import { USE_LOGIN_ZITADEL } from '@/constants';
import zitadelAuth from '@/helpers/zitadelAuth';
import Collapse from '@/components/core/Collapse.vue';
import Input from '@/components/core/Input.vue';
import { computed, reactive } from 'vue';
import * as ws from '@/tools/websocket';
import { useToastStore } from '@/stores/toast';
import Notification from '@/components/core/Notification.vue';

const systemStore = useSystemStore();
const toastStore = useToastStore();
const { decodedToken } = storeToRefs(systemStore);
const router = useRouter();

const changePasswordData = reactive({
    oldPassword: '',
    newPassword: '',
});

const disabledSaveButton = computed(() => {
    return changePasswordData.oldPassword.length === 0 || changePasswordData.newPassword.length === 0;
});

async function logout() {
    if (USE_LOGIN_ZITADEL && zitadelAuth) {
        await zitadelAuth.oidcAuth.signOut({
            post_logout_redirect_uri: window.location.origin,
        });
    }
    systemStore.token = '';
    router.push('/login');
}

async function changePassword() {
    try {
        await ws.sendRPC('FLEET_MANAGER', 'User.Update', {
            username: systemStore.decodedToken.username,
            password: changePasswordData.newPassword,
        });
        toastStore.success('Password chnaged');
    } catch (error) {
        toastStore.error('Failed to change password');
    }
}
</script>
