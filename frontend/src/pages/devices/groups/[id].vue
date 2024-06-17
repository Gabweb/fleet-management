<template>
    <div v-if="group" class="space-y-2">
        <BasicBlock bordered blurred>
            <div class="flex flex-row flex-nowrap gap-2 justify-between align-middle items-center">
                <div class="flex flex-row gap-2 items-center">
                    <RouterLink
                        to="/devices/groups"
                        class="p-1 w-8 h-8 hover:border bg-slate-900 align-middle border-blue-500 rounded-md text-center text-sm hover:cursor-pointer"
                    >
                        <i class="fa-solid fa-chevron-left"></i>
                    </RouterLink>
                    <span class="font-semibold">{{ group.name }}</span>
                </div>
                <div>
                    <Button type="blue" size="sm" class="mr-2" narrow @click="editModalVisible = true"
                        ><i class="fas fa-pencil"
                    /></Button>
                </div>
            </div>
        </BasicBlock>
        <div v-if="group.devices.length > 0" :class="[small ? 'flex flex-col gap-2' : 'widget-grid']">
            <DeviceWidget
                v-for="shellyID in group.devices"
                :key="shellyID"
                :device-id="shellyID"
                :selected="activeDevice === shellyID"
                :vertical="small"
                class="hover:cursor-pointer"
                @click="deviceSelected(shellyID)"
            />
        </div>
        <EmptyBlock v-else>
            <p class="text-xl font-semibold pb-2">Group is emprty.</p>
            <p class="text-sm pb-2">You can add devices to this group by pressing the plus button above.</p>
        </EmptyBlock>

        <EditGroupModal v-model="editModalVisible" :name="group.name" :devices="group.devices" @save="onSave" />
    </div>

    <EmptyBlock v-else>
        <p class="text-xl font-semibold pb-2">Group does not exist.</p>
        <p class="text-sm pb-2">You can create a new group from the Groups page.</p>
        <Button type="blue" class="m-auto" @click="goToGroups">Go to groups</Button>
    </EmptyBlock>
</template>

<script lang="ts" setup>
import { useRoute, useRouter } from 'vue-router/auto';
const route = useRoute('/devices/groups/[id]');
import * as ws from '@/tools/websocket';
import { computed, onMounted, ref } from 'vue';
import BasicBlock from '@/components/core/BasicBlock.vue';
import EmptyBlock from '@/components/core/EmptyBlock.vue';
import Button from '@/components/core/Button.vue';
import DeviceWidget from '@/components/widgets/DeviceWidget.vue';
import { useRightSideMenuStore } from '@/stores/right-side';
import { DeviceBoard } from '@/helpers/components';
import { small } from '@/helpers/ui';
import EditGroupModal from '@/components/modals/EditGroupModal.vue';
import { useGroupsStore } from '@/stores/groups';

const router = useRouter();
const rightSideStore = useRightSideMenuStore();
const groupStore = useGroupsStore();
const activeDevice = ref<string>();

const editModalVisible = ref(false);
const id = computed(() => route.params.id);
const group = ref<{
    id: number;
    name: string;
    devices: string[];
}>(groupStore.groups[Number(id.value)]);

async function onSave(name: string, devices: string[]) {
    await ws.sendRPC('FLEET_MANAGER', 'group.set', {
        id: id.value,
        name,
        devices,
    });
    updateDevices();
}

async function updateDevices() {
    group.value = await ws.sendRPC('FLEET_MANAGER', 'group.get', { id: id.value });
}

function deviceSelected(shellyID: string) {
    rightSideStore.setActiveComponent(DeviceBoard, { shellyID });
    activeDevice.value = shellyID;
}

function goToGroups() {
    router.push('/groups');
}

onMounted(() => {
    updateDevices();
});
</script>
