<template>
    <div v-if="loading">
        <span>loading...</span>
    </div>

    <div v-else-if="error">
        <span>Something went wrong</span>
    </div>

    <div v-else-if="!dashboard">
        <span>Dashboard not found</span>
    </div>

    <div v-else class="space-y-2">
        <BasicBlock bordered blurred>
            <div class="flex flex-row flex-nowrap justify-between align-middle items-center font-semibold">
                <p>{{ dashboard.name }}</p>
                <div class="flex flex-row gap-2">
                    <Button type="blue" size="sm" narrow @click="addWidget"><i class="fas fa-plus" /></Button>
                    <Button type="blue" size="sm" narrow @click="refresh"><i class="fas fa-refresh" /></Button>
                    <Button v-if="!editMode" type="blue" size="sm" narrow @click="toggleEditMode"
                        ><i class="fas fa-pencil"
                    /></Button>
                    <Button v-else type="red" size="sm" narrow @click="toggleEditMode">Exit edit mode</Button>
                </div>
            </div>
        </BasicBlock>

        <EmptyBlock v-if="dashboard.items.length == 0">
            <p class="text-xl font-semibold pb-2">Dashboard is empty</p>
            <p class="text-sm pb-2">
                Try adding new widgets for fast access to your favorite devices, entities, and what ever you need.
            </p>
            <Button type="blue" class="m-auto" @click="addWidget">Add widget</Button>
        </EmptyBlock>

        <div v-else>
            <!-- Widgets -->
            <div class="mt-2" :class="[small ? 'flex flex-col gap-2' : 'widget-grid']">
                <!-- eslint-disable vue/require-v-for-key -->
                <div v-for="(entry, entry_index) of dashboard.items">
                    <!-- Entity -->
                    <EntityWidget
                        v-if="entry.type === 'entity' && entityStore.entities[entry.data.id] != undefined"
                        :key="entry.data.id"
                        :vertical="small"
                        :entity="entityStore.entities[entry.data.id]"
                        :edit-mode="editMode"
                        :selected="selected == entry_index"
                        class="hover:cursor-pointer"
                        @delete="deleteEntry(entry_index)"
                        @click="!editMode && entityClicked(entry_index, entityStore.entities[entry.data.id])"
                    />
                    <!-- Device -->
                    <DeviceWidget
                        v-else-if="entry.type === 'device'"
                        :key="entry.data.shellyID"
                        :edit-mode="editMode"
                        :device-id="entry.data.shellyID"
                        @delete="deleteEntry(entry_index)"
                    />
                    <!-- Group -->
                    <GroupWidget
                        v-else-if="entry.type === 'group' && groupStore.groups[entry.data.id] != undefined"
                        :key="entry.data.name"
                        :name="entry.data.name"
                        :members="groupStore.groups[entry.data.id].devices"
                        :vertical="small"
                        :edit-mode="editMode"
                        class="hover:cursor-pointer"
                        @delete="deleteEntry(entry_index)"
                        @click="!editMode && gotoGroup(entry.data.id)"
                    />
                    <Widget v-else :key="'missing' + entry_index">
                        <template #name>
                            <span class="text-red-700 font-semibold"> Missing Widget </span>
                        </template>
                        <template #description>
                            <span class="text-xs text-gray-400"> Something went wrong displaying this widget </span>
                        </template>
                        <template #action>
                            <Button v-if="editMode" type="red" @click="deleteEntry(entry_index)">Delete</Button>
                        </template>
                    </Widget>
                </div>
            </div>

            <!-- Modals -->
        </div>
        <AddWidgetModal @added="widgetAdded" />
    </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router/auto';
import useUiRegistry from '@/composables/useUiRegistry.ts';
import { computed, watch, onUnmounted, ref } from 'vue';
import { useEntityStore } from '@/stores/entities';
import EmptyBlock from '@/components/core/EmptyBlock.vue';
import EntityWidget from '@/components/widgets/EntityWidget.vue';
import BasicBlock from '@/components/core/BasicBlock.vue';
import { useGroupsStore } from '@/stores/groups';
import GroupWidget from '@/components/widgets/GroupWidget.vue';
import Button from '@/components/core/Button.vue';
import Widget from '@/components/widgets/Widget.vue';
import DeviceWidget from '@/components/widgets/DeviceWidget.vue';
import { EntityBoard } from '@/helpers/components';
import { entity_t } from '@/types';
import { useRightSideMenuStore } from '@/stores/right-side';
import { small } from '@/helpers/ui';
import { useRouter } from 'vue-router/auto';
import AddWidgetModal from '@/components/modals/AddWidgetModal.vue';
import { modals } from '@/helpers/ui';

const route = useRoute('/dash/[id]');
const id = computed(() => route.params.id);
watch(id, () => {
    refresh();
});
const dashboard = computed(() => dashboards.value && dashboards.value[id.value]);

const {
    data: dashboards,
    error,
    loading,
    refresh,
    upload,
} = useUiRegistry<{
    name: string;
    id: number;
    items: any[];
}>('dashboards');

const entityStore = useEntityStore();
const groupStore = useGroupsStore();
const rightSideStore = useRightSideMenuStore();
const selected = ref<number>(-1);
const router = useRouter();

const editMode = ref(false);

function addWidget() {
    modals.addWidget = true;
}

function toggleEditMode() {
    editMode.value = !editMode.value;
}

function deleteEntry(index: number) {
    if (dashboards.value && dashboard.value) {
        dashboard.value.items.splice(index, 1);
        dashboards.value[dashboard.value.id] = dashboard.value;
        upload();
    }
    // dashboardStore.removeFromDashboard(id, row, index);
}

function widgetAdded(item: { type: 'entities' | 'group'; data: any }) {
    modals.addWidget = false;
    if (dashboards.value && dashboard.value) {
        if (item.type === 'group') {
            dashboard.value.items.push(item);
        } else if (item.type === 'entities') {
            const ids = item.data.ids;
            for (const id of ids) {
                dashboard.value.items.push({
                    type: 'entity',
                    data: { id },
                });
            }
        }
        dashboards.value[dashboard.value.id] = dashboard.value;
        upload();
    }
}

function entityClicked(index: number, entity: entity_t) {
    selected.value = index;
    rightSideStore.setActiveComponent(EntityBoard, { entity });
}

function gotoGroup(id: number) {
    router.push({
        name: '/devices/groups/[id]',
        params: {
            id: id,
        },
    });
}

onUnmounted(() => {
    rightSideStore.clearActiveComponent();
});
</script>
