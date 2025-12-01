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

    <div v-else>
        <InfiniteGridScrollPage
            :page="page"
            :total-pages="totalPages"
            :items="items"
            :loading="scrollLoading"
            @load-items="loadItems"
        >
            <template #header>
                <BasicBlock bordered blurred class="relative z-10 mb-2">
                    <div class="flex flex-row flex-nowrap justify-between align-middle items-center font-semibold">
                        <p>{{ dashboard.name }}</p>
                        <div class="flex flex-row gap-2">
                            <Button type="blue" size="sm" narrow @click="addWidget"><i class="fas fa-plus" /></Button>
                            <Button type="blue" size="sm" narrow @click="refresh"><i class="fas fa-refresh" /></Button>
                            <Button v-if="!editMode" type="blue" size="sm" narrow @click="toggleEditMode">
                                <i class="fas fa-pencil" />
                            </Button>
                            <Button v-else type="red" size="sm" narrow @click="toggleEditMode">Exit edit mode</Button>
                        </div>
                    </div>
                </BasicBlock>
            </template>
            <template #default="{ item: entry, item_index: entry_index, small }">
                <!-- Widgets -->
                <!-- Entity -->
                <EntityWidget
                    v-if="(entry as any).type === 'entity' && entityStore.entities[(entry as any).data.id] != undefined"
                    :key="(entry as any).data.id"
                    :vertical="small"
                    :right-corner="false"
                    :entity="entityStore.entities[(entry as any).data.id]"
                    :edit-mode="editMode"
                    :selected="selected == entry_index"
                    class="hover:cursor-pointer"
                    @delete="deleteEntry(entry_index)"
                    @click="!editMode && entityClicked(entry_index, entityStore.entities[(entry as any).data.id])"
                />
                <!-- Device -->
                <DeviceWidget
                    v-else-if="(entry as any).type === 'device'"
                    :key="(entry as any).data.shellyID"
                    :edit-mode="editMode"
                    :device-id="(entry as any).data.shellyID"
                    @delete="deleteEntry(entry_index)"
                />
                <!-- Group -->
                <GroupWidget
                    v-else-if="(entry as any).type === 'group' && groupStore.groups[(entry as any).data.id] != undefined"
                    :key="(entry as any).data.name"
                    :name="(entry as any).data.name"
                    :members="groupStore.groups[(entry as any).data.id].devices"
                    :vertical="small"
                    :edit-mode="editMode"
                    class="hover:cursor-pointer"
                    @delete="deleteEntry(entry_index)"
                    @click="!editMode && gotoGroup((entry as any).data.id)"
                />
                <ActionWidget
                    v-else-if="
                        (entry as any).type === 'action' &&
                        actions &&
                        (entry as any)?.data?.id &&
                        actions.find((a) => a.id === (entry as any).data.id)
                    "
                    :id="(entry as any).data.id"
                    :action="actions.find((a) => a.id === (entry as any).data.id)!"
                    :edit-mode="editMode"
                    @delete="deleteEntry(entry_index)"
                    @click="!editMode && actionClicked(entry_index, (entry as any).data.id)"
                />
                <ClockWidget
                    v-else-if="(entry as any).type === 'ui_widget'"
                    :vertical="small"
                    :edit-mode="editMode"
                    @delete="deleteEntry(entry_index)"
                />
                <!-- <Widget v-else :key="'missing' + entry_index" :vertical="small">
                    <template #name>
                        <span class="text-red-700 font-semibold">Missing Widget</span>
                    </template>
                    <template #description>
                        <span class="text-xs text-gray-400">Something went wrong displaying this widget.</span>
                        <span class="text-xs text-gray-500">{{ (entry as any).data.id }}({{ (entry as any).type }})</span>
                    </template>
                    <template #action>
                        <Button v-if="editMode" type="red" @click="deleteEntry(entry_index)">Delete</Button>
                    </template>
                </Widget> -->
            </template>
            <template #empty>
                <EmptyBlock v-if="dashboard.items.length == 0">
                    <p class="text-xl font-semibold pb-2">Dashboard is empty</p>
                    <p class="text-sm pb-2">
                        Try adding new widgets for fast access to your favorite devices, entities, and what ever you
                        need.
                    </p>
                    <Button type="blue" class="m-auto" @click="addWidget">Add widget</Button>
                </EmptyBlock>
            </template>
        </InfiniteGridScrollPage>
        <AddWidgetModal @added="widgetAdded" />
        <ConfirmationModal ref="modalRefDelete">
            <template #title>
                <h1>
                    You are about to delete a dashboard item!
                    <br />
                    Proceed?
                </h1>
            </template>
            <template #footer></template>
        </ConfirmationModal>
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
import Widget from '@/components/widgets/WidgetsTemplates/VanilaWidget.vue';
import DeviceWidget from '@/components/widgets/WidgetsTemplates/VanilaWidget.vue';
import { EntityBoard, ActionBoard } from '@/helpers/components';
import { action_t, entity_t } from '@/types';
import { useRightSideMenuStore } from '@/stores/right-side';
import { useRouter } from 'vue-router/auto';
import AddWidgetModal from '@/components/modals/AddWidgetModal.vue';
import { modals } from '@/helpers/ui';
import useInfiniteScroll from '@/composables/useInfiniteScroll';
import InfiniteGridScrollPage from '@/components/pages/InfiniteGridScrollPage.vue';
import useRegistry from '@/composables/useRegistry';
import ActionWidget from '@/components/widgets/ActionWidget.vue';
import ConfirmationModal from '@/components/modals/ConfirmationModal.vue';
import ClockWidget from '@/components/widgets/IntegratedWidgets/ClockWidget.vue';
import { getRegistry } from '@/tools/websocket';
import { useToastStore } from '@/stores/toast';
import { useDevicesStore } from '@/stores/devices';

const toast = useToastStore();

const modalRefDelete = ref<InstanceType<typeof ConfirmationModal>>();

const route = useRoute('/dash/[id]');
const id = computed(() => route.params.id);

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

const { data: actionsRaw, error: actionsError, loading: actionsLoading, refresh: actionsRefresh } = useRegistry<action_t[]>('actions', 'rpc');
const actions = computed(() => actionsRaw.value || []);

const dashboard = ref();
watch(
  id,
  async () => {
    const raw = await getRegistry('ui').getItem('dashboards');
    const mapped = (raw as any).map((d: { id: any; name: any; items: { type: number; id: any; sub_item: string; item: any; }[]; }) => ({
      id: d.id,
      name: d.name,
      items: d.items.map((it: { type: number; id: any; sub_item: string; item: any; }) => {
        let typeStr: string;
        switch (it.type) {
          case 1:
            typeStr = 'device';
            break;
          case 2:
            typeStr = 'entity';
            break;
          case 3:
            typeStr = 'group';
            break;
          case 4:
            typeStr = 'action';
            break;
          case 5:
            typeStr = 'ui_widget';
            break;
          default:
            typeStr = 'unknown';
            break;
        }

        if (it.type === 2) {
          return {
            id: it.id,
            type: typeStr,
            data: {
              id: it.sub_item as string,
              device: it.item
            }
          };
        }
        if (it.type === 4) {
          return {
            id: it.id,
            type: typeStr,
            data: {
              id: String(it.item),
              subId: it.sub_item
            }
          };
        }
        return {
          id: it.id,
          type: typeStr,
          data: {
            id: it.item,
            subId: it.sub_item
          }
        };
      })
    }));
    const dict: Record<string, { id: number; name: string; items: any[] }> = {};
    for (const d of mapped) {
      dict[d.id.toString()] = d;
    }

    dashboards.value = dict;
    dashboard.value = dict[id.value.toString()] ?? null;
  },
  { immediate: true }
);




const dashboardItems = computed(() => (dashboard.value?.items ?? []).slice());

const { items, page, totalPages, loading: scrollLoading, loadItems } = useInfiniteScroll(dashboardItems);

const entityStore = useEntityStore();
const groupStore = useGroupsStore();
const rightSideStore = useRightSideMenuStore();
const selected = ref<number>(1);
const router = useRouter();

const editMode = ref(false);

function addWidget() {
    modals.addWidget = true;
}

function toggleEditMode() {
    editMode.value = !editMode.value;
}


function deleteEntry(index: number) {
  if (!modalRefDelete.value) return;

  modalRefDelete.value.storeAction(async () => {
    if (!dashboard.value) return;
    const dash = dashboard.value;
    const entry = dash.items[index];

    try {
      await getRegistry('ui').removeWidget('dashboards', {
        dashboard: dash.id,
        itemId:    entry.id,
      });

      dash.items.splice(index, 1);

    } catch (err) {
      console.error('Failed to remove widget:', err);
      toast.error('Could not delete widget. Please try again.');
    }
  });
}






async function widgetAdded(item: { type: 'entities' | 'group' | 'action' | 'ui_widget'; data: any }) {
  modals.addWidget = false;
  if (!dashboards.value || !dashboard.value) return;

  const dashId = dashboard.value.id;
  const rpc    = getRegistry('ui').addItem;
  const toast  = useToastStore();
  const devicesStore = useDevicesStore();

  switch (item.type) {
    case 'action':
      await rpc('dashboards', { dashboard: dashId, type: 4, item: Number(item.data.id), order: dashboard.value.items.length });
      dashboard.value.items.push(item);
      break;

    case 'group':
      await rpc('dashboards', { dashboard: dashId, type: 3, item: item.data.id, order: dashboard.value.items.length });
      dashboard.value.items.push(item);
      break;

    case 'ui_widget':
      await rpc('dashboards', { dashboard: dashId, type: 5, item: 0, order: dashboard.value.items.length });
      dashboard.value.items.push(item);
      break;

    case 'entities': {
      const ids: string[] = [...item.data.ids];
      for (const fullId of ids) {
        const underscoreIndex = fullId.indexOf('_');
        const shellyId = underscoreIndex === -1
          ? fullId
          : fullId.slice(0, underscoreIndex);
        const entitySuffix = underscoreIndex === -1
          ? ''
          : fullId.slice(underscoreIndex + 1);

        const device = devicesStore.devices[shellyId];
        if (!device) {
          toast.error(`Device "${shellyId}" not found`);
          continue;
        }
        const deviceId = device.id;
        const idx = dashboard.value.items.length;
        await rpc('dashboards', {
          dashboard: dashId,
          type:      2,          
          item:      deviceId,   
          order:     idx,
          sub_item:  fullId 
        });
        dashboard.value.items.push({
          type: 'entity',
          data: {
            id:     fullId,
            device: deviceId,
            suffix: entitySuffix
          }
        });
      }
      break;
    }
  }

  dashboards.value = { 
    ...dashboards.value, 
    [dashId]: { ...dashboard.value } 
  };
  loadItems();
}




function entityClicked(index: number, entity: entity_t) {
    selected.value = index;
    rightSideStore.setActiveComponent(EntityBoard, { entity });
}

function actionClicked(index: number, actionID: string) {
    selected.value = index;
    rightSideStore.setActiveComponent(ActionBoard, { actionID });
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
