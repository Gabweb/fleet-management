<template>
  <InfiniteGridScrollPage
    :page="page"
    :total-pages="totalPages"
    :items="items"
    :loading="loading"
    customClass="widget-grid-devices"
    @load-items="loadItems"
  >
    <template #header>
      <BasicBlock bordered blurred class="relative z-10 mb-2">
        <div class="flex flex-col gap-3">
          <div class="flex flex-col md:flex-row gap-2 items-center justify-between">
            <div class="flex flex-1 flex-row flex-wrap gap-2 items-center">
              <div class="flex items-center gap-2 min-w-[200px] flex-1 max-w-md">
                <Input v-model="nameFilter" placeholder="Search" clear class="w-full" />
                <Button :type="hasFiltersFromModal ? 'red' : 'blue'" size="sm" narrow @click="filterVisible = true">
                  <i class="fas fa-filter" />
                </Button>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <span
                  v-for="([key, value]) in activeFilterPillsEntries"
                  :key="key"
                  class="pill bg-gray-200 text-gray-800 rounded-full px-2 py-1 text-sm flex items-center gap-1"
                >
                  {{ key === 'online' ? (value ? 'Online' : 'Offline') : value }}
                  <button @click="clearPill(key as 'type' | 'group' | 'online')" class="focus:outline-none">×</button>
                </span>
              </div>
            </div>
            <div class="flex flex-row gap-2">
              <Button v-if="selectMode && selectedDevices.length" type="blue" @click="rpcBuilderStore.showModal = true">
                Send RPC to {{ selectedDevices.length }} devices
              </Button>
              <Button narrow :type="selectMode ? 'red' : 'blue'" @click="selectMode = !selectMode">
                {{ selectMode ? 'Discard Action' : 'Create Action' }}
              </Button>
              <Button v-if="!editMode" type="blue" size="sm" narrow @click="toggleEditMode">
                <i class="fas fa-pencil" />
              </Button>
              <Button v-else type="red" size="sm" narrow @click="toggleEditMode">
                Exit edit mode
              </Button>
            </div>
          </div>
          <div class="flex flex-row gap-2 items-baseline justify-center">
            <span class="w-full font-bold size-3">{{ devicesCalculation }}</span>
          </div>
        </div>
      </BasicBlock>

      <SendRpcModal @close="sendRpcClosed" />
      <ConfirmationModal ref="modalRefDelete">
        <template #title>
          <h1>You are about to delete a device! <br />Proceed?</h1>
        </template>
      </ConfirmationModal>
      <DeviceFilter
        v-model="filterVisible"
        :filters="activeFilterPills"
        :key="JSON.stringify(activeFilterPills)"
        @setFilters="setActiveFilters"
        @devices="setDevices"
      />
    </template>

    <template #default="{ item, small }">
      <DeviceWidget
        v-if="item.kind === 'device'"
        :key="item.data.shellyID"
        :device-id="item.data.shellyID"
        :vertical="small"
        :select-mode="selectMode"
        :edit-mode="editMode"
        :selected="(selectMode && item.data.selected) || activeDevice === item.data.shellyID"
        class="hover:cursor-pointer"
        @click.stop="clicked(item.data)"
        @delete="deleteDevice(item.data.shellyID, item.data.id)"
      />
      <BTHomeDeviceWidget
        v-else
        :key="item.data.id"
        :device="item.data"
        :vertical="small"
        :selected="activeSensor === item.data.id"
        class="hover:cursor-pointer"
        @click="sensorClicked(item.data)"
      />
    </template>

    <template #empty>
      <EmptyBlock v-if="rawDevices.length === 0">
        <p class="text-xl font-semibold pb-2">No devices found</p>
        <p class="text-sm pb-2">Connect Shelly devices via their outbound websocket.</p>
      </EmptyBlock>
    </template>
  </InfiniteGridScrollPage>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import InfiniteGridScrollPage from '@/components/pages/InfiniteGridScrollPage.vue';
import { useDevicesStore } from '@/stores/devices';
import type { shelly_device_t } from '@/types';
import Input from '@/components/core/Input.vue';
import BasicBlock from '@/components/core/BasicBlock.vue';
import SendRpcModal from '@/components/modals/SendRpcModal.vue';
import ConfirmationModal from '@/components/modals/ConfirmationModal.vue';
import { useRpcBuilderStore } from '@/stores/rpc-builder';
import Button from '@/components/core/Button.vue';
import { useRightSideMenuStore } from '@/stores/right-side';
import { DeviceBoard } from '@/helpers/components';
import DeviceWidget from '@/components/widgets/DeviceWidget.vue';
import DeviceFilter from '@/components/pages/devices/DeviceFilter.vue';
import { useDeviceFiltering } from '@/composables/useDeviceFiltering';
import useInfiniteScroll from '@/composables/useInfiniteScroll';
import EmptyBlock from '@/components/core/EmptyBlock.vue';
import BTHomeDeviceWidget from '@/components/widgets/BTHomeDeviceWidget.vue';
import SensorBoard from '@/components/boards/SensorBoard.vue';
import { sendRPC } from '@/tools/websocket';
import type { DefineComponent } from 'vue';
import { useSensorsStore, type SensorDevice } from '@/stores/sensors';

interface GridDevice { kind: 'device'; data: shelly_device_t }
interface GridSensor { kind: 'sensor'; data: SensorDevice }
type GridItem = GridDevice | GridSensor;

const deviceStore = useDevicesStore();
const rawDevices = computed(() => Object.values(deviceStore.devices));
const rpcBuilderStore = useRpcBuilderStore();
const rightSideStore = useRightSideMenuStore();
const modalRefDelete = ref<InstanceType<typeof ConfirmationModal>>();
const filterVisible = ref(false);
const nameFilter = ref('');
const selectMode = ref(false);
const editMode = ref(false);
const activeDevice = ref<string|null>(null);

const defaultFilters = { type: 'All devices', group: 'All groups', online: null as boolean|null };
const activeFilterPills = reactive({ ...defaultFilters });
const pillFiltered = ref<shelly_device_t[]>([]);

const showDevices = computed(() =>
  pillFiltered.value.filter(dev => {
    if (!nameFilter.value) return true;
    const needle = nameFilter.value.toLowerCase();
    return [dev.info?.name, dev.info?.id]
      .some(txt => typeof txt === 'string' && txt.toLowerCase().includes(needle));
  })
);

const hasFiltersFromModal = computed(() => rawDevices.value.length !== showDevices.value.length);
const devicesCalculation = computed(() => {
  const total = rawDevices.value.length;
  const online = rawDevices.value.filter(d => d.online).length;
  const filtered = showDevices.value.length;
  return filtered !== total
    ? `Showing ${filtered}/${total} devices.`
    : `Total ${total} devices (${online} online)`;
});
const selectedDevices = computed(() =>
  Object.values(deviceStore.devices).filter(d => d.selected)
);

const sensorsStore = useSensorsStore();
const { sensors } = storeToRefs(sensorsStore);

const combinedItems = computed<GridItem[]>(() =>
  showDevices.value.flatMap(dev => {
    const settings = dev.settings as Record<string, any>;
    const macs = Object.keys(settings)
      .filter(key => key.startsWith('bthomedevice:'))
      .map(key => settings[key].addr as string);
    const out: GridItem[] = [{ kind: 'device', data: dev }];
    sensors.value
      .filter(s => macs.includes(s.id))
      .forEach(s => out.push({ kind: 'sensor', data: s }));
    return out;
  })
);

const { items, page, totalPages, loading, loadItems } =
  useInfiniteScroll<GridItem>(combinedItems);

const activeFilterPillsEntries = computed(() =>
  Object.entries(activeFilterPills).filter(([key, value]) =>
    key === 'type'  ? value !== defaultFilters.type
    : key === 'group' ? value !== defaultFilters.group
    : key === 'online'? value !== null
    : false
));

function setActiveFilters(filters: typeof activeFilterPills) {
  Object.assign(activeFilterPills, filters);
}
function clearPill(key: 'type' | 'group' | 'online') {
  if (key === 'type')   activeFilterPills.type   = defaultFilters.type;
  if (key === 'group')  activeFilterPills.group  = defaultFilters.group;
  if (key === 'online') activeFilterPills.online = defaultFilters.online;
  const { filtered } = useDeviceFiltering(rawDevices.value, activeFilterPills);
  pillFiltered.value = filtered.value;
}

function toggleEditMode() {
  selectedDevices.value.forEach(d => d.selected = false);
  deviceStore.selectedDevices.length = 0;
  editMode.value = !editMode.value;
}

function recomputeFiltered() {
  const { filtered } = useDeviceFiltering(rawDevices.value, activeFilterPills);
  pillFiltered.value = filtered.value;
}

function deleteDevice(shellyID: string, id?: number) {
  modalRefDelete.value?.storeAction(async () => {
    await sendRPC('FLEET_MANAGER', 'device.Delete', id != null ? { shellyID, id } : { shellyID });
    
    deviceStore.deviceDeleted(shellyID);

    if (activeDevice.value === shellyID) {
      rightSideStore.clearActiveComponent();
      activeDevice.value = null;
    }

    recomputeFiltered();
  });
}

function clicked(device: shelly_device_t) {
  if (!selectMode.value) {
    rightSideStore.setActiveComponent(DeviceBoard, { shellyID: device.shellyID });
    activeDevice.value = device.shellyID;
  } else {
    device.selected = !device.selected;
  }
}

function sendRpcClosed() {
  selectedDevices.value.forEach(d => d.selected = false);
  deviceStore.selectedDevices.length = 0;
  deviceStore.rpcResponses = {};
  activeDevice.value = '';
  selectMode.value = false;
}

function setDevices(devs: shelly_device_t[]) {
  pillFiltered.value = devs;
}

watch(selectMode, v => {
  if (v) rawDevices.value.forEach(d => d.selected = false);  
  activeDevice.value = '';
});

onMounted(async () => {
  await deviceStore.fetchDevices();
  if (rawDevices.value.length) {
    const { filtered } = useDeviceFiltering(rawDevices.value, activeFilterPills);
    pillFiltered.value = filtered.value;
  }
});
watch(() => rawDevices.value.length, len => {
  if (len && !pillFiltered.value.length) {
    const { filtered } = useDeviceFiltering(rawDevices.value, activeFilterPills);
    pillFiltered.value = filtered.value;
  }
});
onUnmounted(() => rightSideStore.clearActiveComponent());

const activeSensor = ref<string|null>(null);
function sensorClicked(sensor: SensorDevice) {
  activeSensor.value = activeSensor.value === sensor.id ? null : sensor.id;
  rightSideStore.setActiveComponent(
    SensorBoard as unknown as DefineComponent,
    { sensorId: sensor.id, sensorName: sensor.name }
  );
}
</script>
