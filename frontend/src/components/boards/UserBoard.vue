<template>
<div class="w-full max-w-7xl mx-auto">
    <BasicBlock>
        <div class="w-full max-w-sm border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700">
            <div class="flex justify-end px-4 pt-4">
            </div>
            <div class="flex flex-col items-center pb-10">
                <img class="w-24 h-24 mb-3 rounded-full shadow-lg" :src="userImg" @error="imageLoadError" />
                <h5 class="mb-1 text-xl font-medium text-gray-900 dark:text-white">{{ props.user.name }}</h5>
                <span class="text-md text-gray-500 dark:text-gray-400">{{ props.user.group }}</span>
                <span class="text-md" :class="[props.user.enabled ? 'text-green-500' : 'text-red-500']">{{
                    props.user.enabled ?
                        'Enabled' : 'Disabled' }}</span>
            </div>
        </div>
    </BasicBlock>

    <BasicBlock title="General information" title-padding>
        <TabSelector :tabs="['Permissions', 'Groups', 'Devices', 'FleetManager']">
            <!-- Permissions Tab -->
            <template #Permissions>
                <div v-if="summarizedPermissions.permissions.length > 0">
                    <div class="max-w-7xl mx-auto">
                        <div class="bg-gray-800 shadow overflow-hidden">
                            <table class="min-w-full divide-y divide-gray-700 border border-gray-700">
                                <thead class="bg-gray-800">
                                    <tr>
                                        <th class="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Scope</th>
                                        <th class="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Permission</th>
                                    </tr>
                                </thead>
                                <tbody class="bg-gray-800 divide-y divide-gray-700">
                                    <tr v-for="permission in summarizedPermissions.permissions" :key="permission.key + permission.value">
                                        <td class="px-3 py-4 whitespace-nowrap">
                                            <div class="text-sm font-medium text-gray-300">{{ permission.key }}</div>
                                        </td>
                                        <td class="px-3 py-4 whitespace-nowrap">
                                            <div class="text-sm font-medium text-gray-300">
                                                {{ permission.value==='*'? 'All permissions': permission.value }}
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div v-else>
                    <p class="text-center text-gray-500">No permissions found</p>
                </div>
            </template>

            <!-- Groups Tab -->
            <template #Groups>
                <div v-if="summarizedPermissions.groups.length > 0">
                    <div class="max-w-7xl mx-auto">
                        <div class="bg-gray-800 shadow overflow-hidden">
                            <table class="min-w-full divide-y divide-gray-700 border border-gray-700">
                                <thead class="bg-gray-800">
                                    <tr>
                                        <th class="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Scope</th>
                                        <th class="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Group</th>
                                    </tr>
                                </thead>
                                <tbody class="bg-gray-800 divide-y divide-gray-700">
                                    <tr v-for="group in summarizedPermissions.groups" :key="group.key + group.value">
                                        <td class="px-3 py-4 whitespace-nowrap">
                                            <div class="text-sm font-medium text-gray-300">{{ group.key }}</div>
                                        </td>
                                        <td class="px-3 py-4 whitespace-nowrap">
                                            <div class="text-sm font-medium text-gray-300">
                                                {{ group.value ==='*'? 'All permissions': group.value }}
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div v-else>
                    <p class="text-center text-gray-500">No groups found</p>
                </div>
            </template>

            <!-- Devices Tab -->
            <template #Devices>
                <div v-if="summarizedPermissions.devices.length > 0">
                    <div class="max-w-7xl mx-auto">
                        <div class="bg-gray-800 shadow overflow-hidden">
                            <table class="min-w-full divide-y divide-gray-700 border border-gray-700">
                                <thead class="bg-gray-800">
                                    <tr>
                                        <th class="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Scope</th>
                                        <th class="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Device</th>
                                    </tr>
                                </thead>
                                <tbody class="bg-gray-800 divide-y divide-gray-700">
                                    <tr v-for="device in summarizedPermissions.devices" :key="device.key + device.value">
                                        <td class="px-3 py-4 whitespace-nowrap">
                                            <div class="text-sm font-medium text-gray-300">{{ device.key }}</div>
                                        </td>
                                        <td class="px-3 py-4 whitespace-nowrap">
                                            <div class="text-sm font-medium text-gray-300">
                                                {{ device.value ==='*'? 'All permissions': device.value }}
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div v-else>
                    <p class="text-center text-gray-500">No devices found</p>
                </div>
            </template>
            <template #FleetManager>
                <div v-if="summarizedPermissions.fleetManager.length > 0">
                    <div class="max-w-7xl mx-auto">
                        <div class="bg-gray-800 shadow overflow-hidden">
                            <table class="min-w-full divide-y divide-gray-700 border border-gray-700">
                                <thead class="bg-gray-800">
                                    <tr>
                                        <th class="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Scope</th>
                                        <th class="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Permission</th>
                                    </tr>
                                </thead>
                                <tbody class="bg-gray-800 divide-y divide-gray-700">
                                    <tr v-for="fm in summarizedPermissions.fleetManager" :key="fm.key + fm.value">
                                        <td class="px-3 py-4 whitespace-nowrap">
                                            <div class="text-sm font-medium text-gray-300">{{ fm.key }}</div>
                                        </td>
                                        <td class="px-3 py-4 whitespace-nowrap">
                                            <div class="text-sm font-medium text-gray-300">
                                                {{ fm.value ==='*'? 'All permissions': fm.value }}
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div v-else>
                    <p class="text-center text-gray-500">No permissions found</p>
                </div>
            </template>
        </TabSelector>
    </BasicBlock>
</div>
</template>


<script setup lang="ts">
import { computed, ref, toRef } from 'vue';
import BasicBlock from '../core/BasicBlock.vue';
import TabSelector from '../core/TabSelector.vue';
import { FLEET_MANAGER_HTTP } from '@/constants';
import { useAuthStore } from '@/stores/auth';
import { possiblePermissionsForUser } from '@/helpers/sharedInfo';
const authStore = useAuthStore();

const props = defineProps<{
    user: any;
}>();

const user = toRef(props, 'user');

const emit = defineEmits<{
    close: [];
}>();

const userImg = ref<string>(`${FLEET_MANAGER_HTTP}/uploads/profilePics/${props.user.username}.png`);

function imageLoadError() {
    userImg.value = FLEET_MANAGER_HTTP + '/uploads/profilePics/default.png';
}

function parsePermissions(permissions: Array<string>) {
    const result = {
        permissions: [] as { key: string; value: string }[],
        devices: [] as { key: string; value: string }[],
        groups: [] as { key: string; value: string }[],
        fleetManager: [] as { key: string; value: string }[]
    };

    permissions.forEach(permission => {
        const [key, ...rest] = permission.split('.');
        const value = rest.join('.');
        if (key === 'Device') {
            result.devices.push({ key, value });
        } else if (key === 'Group' || key === 'Groups') {
            result.groups.push({ key, value });
        } else if (key === 'FleetManager') {
            result.fleetManager.push({ key, value });
        } else {
            result.permissions.push({ key, value });
        }
    });

    return result;
}

const summarizedPermissions = computed(() => {
    const parsed = parsePermissions(props.user.permissions);

    // Summarize categories that have dedicated keys
    if (possiblePermissionsForUser.Device &&
        parsed.devices.length &&
        parsed.devices.length === possiblePermissionsForUser.Device.length) {
        parsed.devices = [{ key: "Device", value: "*" }];
    }
    if (possiblePermissionsForUser.Group &&
        parsed.groups.length &&
        parsed.groups.length === possiblePermissionsForUser.Group.length) {
        parsed.groups = [{ key: "Group", value: "*" }];
    }
    if (possiblePermissionsForUser.FleetManager &&
        parsed.fleetManager.length &&
        parsed.fleetManager.length === possiblePermissionsForUser.FleetManager.length) {
        parsed.fleetManager = [{ key: "FleetManager", value: "*" }];
    }

    // Process other permission categories from parsed.permissions by grouping them by key
    const grouped: Record<string, { key: string; value: string }[]> = {};
    parsed.permissions.forEach(item => {
        if (!grouped[item.key]) grouped[item.key] = [];
        grouped[item.key].push(item);
    });
    const summarizedOther: { key: string; value: string }[] = [];
    for (const group in grouped) {
        if (possiblePermissionsForUser[group] && 
            grouped[group].length === possiblePermissionsForUser[group].length) {
            summarizedOther.push({ key: group, value: "*" });
        } else {
            summarizedOther.push(...grouped[group]);
        }
    }
    parsed.permissions = summarizedOther;

    return parsed;
});

const categorizedPermissions = computed(() => parsePermissions(props.user.permissions));
const isPermissionEmpty = computed(() => {
    const { permissions, devices, groups } = categorizedPermissions.value;
    return (
        permissions.length === 0 &&
        devices.length === 0 &&
        groups.length === 0
    );
});
</script>




<style scoped></style>