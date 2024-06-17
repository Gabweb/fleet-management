<template>
    <div class="space-y-2">
        <BasicBlock darker>
            <div class="relative">
                <div class="space-y-3">
                    <div>
                        <span class="text-md font-semibold">Select profile</span>
                    </div>
                    <Dropdown :options="profiles" @selected="profileChanged" />

                    <Collapse :key="profile" title="Delete profile">
                        <Button type="red" @click="deleteProfile(profile)">Delete profile '{{ profile }}'</Button>
                    </Collapse>
                </div>

                <div class="absolute top-0 right-0">
                    <Button type="blue" @click="createProfileModal = true">Add profile</Button>
                </div>
            </div>
        </BasicBlock>

        <BasicBlock darker>
            <div>
                <span class="text-md font-semibold">
                    {{ Object.keys(configs).length }} Configurations in {{ profile }}</span
                >
            </div>
            <Collapse v-for="(config, key) in configs" :key="key" class="mt-2" :title="key">
                <JSONViewer :data="config as { [key: string]: unknown }" />
                <Button type="red" class="mt-2" @click="deleteConfig(key)">Delete</Button>
            </Collapse>
        </BasicBlock>
        <BasicBlock darker :loading="loading">
            <div class="mb-2">
                <span class="text-md font-semibold">Add a configuration in {{ profile }}</span>
            </div>
            <Collapse title="New configuration">
                <div class="max-w-sm space-y-3">
                    <Input v-model="newConfig.name" label="Name" placeholder="Enter new configuration name" />
                    <p class="text-xl font-semibold">Websocket</p>
                    <Input v-model="newConfig.ws" label="WS address" placeholder="Enter Fleet Manager address" />
                    <p class="text-xl font-semibold">Wi-Fi</p>
                    <Input v-model="newConfig.wifi.ssid" label="Network name" placeholder="Enter Wi-Fi name" />
                    <Input v-model="newConfig.wifi.pass" label="Password" placeholder="Enter Wi-Fi password" />
                    <Button type="blue" @click="addNewConfiguration"> Add new configuration </Button>
                </div>
            </Collapse>
        </BasicBlock>

        <!-- Modal for creating a profile -->
        <Modal :visible="createProfileModal">
            <template #title>
                <p class="text-2xl font-semibold">Create Profile</p>
            </template>
            <template #default>
                <Input v-model="newProfileName" label="Group name" type="text" placeholder="Enter profile name" />
            </template>
            <template #footer>
                <Button type="blue" class="mr-2" @click="createProfile">Create profile</Button>
                <Button type="blue" @click="createProfileModal = false">Cancel</Button>
            </template>
        </Modal>
    </div>
</template>

<script setup lang="ts">
import JSONViewer from '@/components/JSONViewer.vue';
import BasicBlock from '@/components/core/BasicBlock.vue';
import Button from '@/components/core/Button.vue';
import Collapse from '@/components/core/Collapse.vue';
import Dropdown from '@/components/core/Dropdown.vue';
import Input from '@/components/core/Input.vue';
import Modal from '@/components/modals/Modal.vue';
import { useToastStore } from '@/stores/toast';
import * as ws from '@/tools/websocket';
import { onMounted, ref } from 'vue';

const toast = useToastStore();
const configsRegistry = ws.getRegistry('configs');
const loading = ref(false);

const profiles = ref(['Default']);
const profile = ref('Default');

const configs = ref<Record<string, unknown>>({});
const newConfig = ref({
    name: 'My Configuration',
    ws: '',
    wifi: {
        ssid: '',
        pass: '',
    },
});

// Modal

const createProfileModal = ref(false);
const newProfileName = ref('');

async function createProfile() {
    const name = newProfileName.value;

    if (name.length == 0) {
        return;
    }

    try {
        await configsRegistry.setItem(name, {});
        await refreshProfiles();
        await refreshConfigs();
    } catch (error) {
        toast.error('Failed to create a new profile');
    } finally {
        createProfileModal.value = false;
    }
}

function profileChanged(val: string) {
    profile.value = val;
    refreshConfigs();
}

async function refreshConfigs() {
    configs.value = (await configsRegistry.getItem(profile.value)) || {};
}

async function addNewConfiguration() {
    loading.value = true;
    const myConfig = {
        ws: {
            enable: true,
            server: newConfig.value.ws,
        },
        wifi: {
            sta: {
                enable: true,
                ssid: newConfig.value.wifi.ssid,
                pass: newConfig.value.wifi.pass,
            },
        },
    };
    try {
        configs.value[newConfig.value.name] = myConfig;
        await configsRegistry.setItem(profile.value, configs.value);

        // reset values
        setTimeout(() => {
            newConfig.value = {
                name: 'My Configuration',
                ws: '',
                wifi: {
                    ssid: '',
                    pass: '',
                },
            };
        }, 100);
    } catch (error) {
        console.error(error);
    } finally {
        loading.value = false;
    }
}

async function deleteProfile(name: string) {
    try {
        await configsRegistry.removeItem(name);
        await refreshProfiles();
        await refreshConfigs();
        toast.info(`Deleted profile '${name}'`);
    } catch (error) {
        toast.error(`Failed to delete profile '${name}'`);
    }
}

async function deleteConfig(name: string) {
    delete configs.value[name];
    await configsRegistry.setItem(profile.value, configs.value);
}

async function refreshProfiles() {
    profiles.value = await configsRegistry.keys();
    if (!profiles.value.includes(profile.value)) {
        profileChanged(profiles.value[0]);
    }
}

onMounted(async () => {
    try {
        await refreshProfiles();
        await refreshConfigs();
    } catch (error) {
        toast.error('cannot refresh configs');
        console.error('cannot refresh configs', error);
    }
});
</script>
