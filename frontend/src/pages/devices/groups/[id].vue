<template>
    <div v-if="group" class="space-y-2">
        <InfiniteGridScrollPage :page="page" :total-pages="totalPages" :items="filteredItems" :loading="loading"
            @load-items="loadItems">
            <template #header>
                <BasicBlock bordered blurred class="mb-2">
                    <div class="flex flex-col gap-3">
                        <div class="flex flex-row flex-nowrap gap-2 justify-between align-middle items-center">
                            <div class="flex flex-row gap-2 items-center">
                                <div class="p-1 w-8 h-8 hover:border bg-slate-900 align-middle border-blue-500 rounded-md text-center text-sm hover:cursor-pointer"
                                    @click="handleGoBack()">
                                    <i class="fa-solid fa-chevron-left"></i>
                                </div>

                                <span class="font-semibold">{{ group.name }}</span>
                                <div class="flex flex-row gap-2 items-center justify-between">
                                    <div class="flex flex-row gap-2 items-baseline">
                                        <Input v-model="nameFilter" placeholder="Search item" clear
                                        class="w-full"
                                            @focus="searchBarFocused = !searchBarFocused" />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <Button type="blue" size="sm" class="mr-2" narrow @click="editModalVisible = true"><i
                                        class="fas fa-pencil" /></Button>
                            </div>
                        </div>
                        <div class="flex flex-row gap-2 items-baseline justify-center">
                            <span class="w-full font-bold size-3">{{ entitiesCalculation }}</span>
                        </div>
                    </div>
                </BasicBlock>
            </template>

            <template #default="{ item: shellyID, small }">
                <DeviceWidget :key="shellyID" :device-id="shellyID" :selected="activeDevice === shellyID"
                    :vertical="small" class="hover:cursor-pointer" @click="deviceSelected(shellyID)" />
            </template>

            <template #empty>
                <EmptyBlock>
                    <p class="text-xl font-semibold pb-2">Group is empty.</p>
                    <p class="text-sm pb-2">You can add devices to this group by pressing the plus button above.</p>
                </EmptyBlock>
            </template>
        </InfiniteGridScrollPage>

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
import EditGroupModal from '@/components/modals/EditGroupModal.vue';
import { useGroupsStore } from '@/stores/groups';
import useInfiniteScroll from '@/composables/useInfiniteScroll';
import InfiniteGridScrollPage from '@/components/pages/InfiniteGridScrollPage.vue';
import Input from '@/components/core/Input.vue';
import { useDevicesStore } from '@/stores/devices';
import { getDeviceName } from '@/helpers/device';

const router = useRouter();
const rightSideStore = useRightSideMenuStore();
const groupStore = useGroupsStore();
const deviceStore = useDevicesStore();
const activeDevice = ref<string>();
const nameFilter = ref('');
const searchBarFocused = ref(false);

const editModalVisible = ref(false);
const id = computed(() => route.params.id);
const group = computed(() => {
  const numericId = Number(id.value);
  return groupStore.groups[numericId];
});
const devices = computed(() => group.value?.devices || []);
const { items, page, totalPages, loading, loadItems } = useInfiniteScroll(devices);

async function onSave(name: string, devices: string[]) {
  await ws.sendRPC('FLEET_MANAGER', 'group.set', {
    id: id.value,
    name,
    devices,
  });
  await groupStore.fetchGroups();
}


const filteredItems = computed(() => {
    return items.value.filter((shellyID) => {
        let device = getDeviceName(deviceStore.devices[shellyID]);
        return (((device as any)?.name?.toLowerCase() || ((device as any)?.jwt?.n?.toLowerCase()) || ((device as any)?.id?.toLowerCase())) || shellyID.toLowerCase()).includes(nameFilter.value.toLowerCase());
    });
});

const entitiesCalculation = computed(() => {
    const total = items.value.length;
    const filtered = filteredItems.value.length;

    if (nameFilter.value) {
        return `Filtered ${filtered} from ${total} elements`;
    } else {
        return `Total ${total} elements`;
    }
});


function deviceSelected(shellyID: string) {
    rightSideStore.setActiveComponent(DeviceBoard, { shellyID });
    activeDevice.value = shellyID;
}

function goToGroups() {
    router.push('/groups');
}

function handleGoBack() {
    if (window.history.length > 1) {
        history.back();
    } else {
        router.push('/devices/groups');
    }
}

</script>
