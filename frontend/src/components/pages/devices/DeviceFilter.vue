<template>
  <Modal :visible="visible" @close="visible = false">
    <template #title>Filters</template>
    <div class="space-y-4">
      <div>
        <h1 class="text-lg font-semibold">Online state</h1>
        <Dropdown
          :options="allOnline"
          :icons="['', 'fa-wifi', 'fa-wifi-slash']"
          :default="defaultOnlineLabel"
          :toDefault="visible"
          @selected="onlineFilterSelected"
        />
      </div>
      <hr class="my-4"/>
      <div>
        <h1 class="text-lg font-semibold">Type</h1>
        <Dropdown
          :options="allDeviceTypes"
          :default="typeFilter"
          :toDefault="visible"
          @selected="val => typeFilter = val"
        />
      </div>
      <hr class="my-4"/>
      <div>
        <h1 class="text-lg font-semibold">Group</h1>
        <Dropdown
          :options="allGroups"
          :default="groupFilter"
          :toDefault="visible"
          @selected="val => groupFilter = val"
        />
      </div>
      <hr class="my-4"/>
      <div>
        <h1 class="text-lg font-semibold">Profiles</h1>
        <Dropdown :options="['Device Profiles']" :toDefault="visible" />
      </div>
      <hr class="my-4"/>
      <Button narrow type="red" class="w-full" @click="clearFilters">
        Clear filters
      </Button>
    </div>
    <template #footer>
      <div class="flex flex-row-reverse gap-2">
        <Button @click="applyClicked">Apply</Button>
        <Button type="red" @click="visible = false">Cancel</Button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, shallowRef, watch, computed } from 'vue';
import Modal from '@/components/modals/Modal.vue';
import Dropdown from '@/components/core/Dropdown.vue';
import Button from '@/components/core/Button.vue';
import { useDevicesStore } from '@/stores/devices';
import { storeToRefs } from 'pinia';
import { useGroupsStore } from '@/stores/groups';
import { useDeviceFiltering } from '@/composables/useDeviceFiltering';
import type { shelly_device_t } from '@/types';

const props = withDefaults(defineProps<{
  filters?: { online: boolean | null; type: string; group: string }
}>(), {
  filters: () => ({ online: null, type: 'All devices', group: 'All groups' })
});

const emit = defineEmits<{
  (e: 'devices', devices: shelly_device_t[]): void;
  (e: 'setFilters', filters: { online: boolean | null; type: string; group: string }): void;
}>();

const visible = defineModel<boolean>({ required: true });

const deviceStore = useDevicesStore();
const { devices } = storeToRefs(deviceStore);
const groupStore = useGroupsStore();
const { groups } = storeToRefs(groupStore);

const allOnline = shallowRef<string[]>([]);
const allDeviceTypes = shallowRef<string[]>([]);
const allGroups = shallowRef<string[]>([]);

const onlineFilter = ref<boolean | null>(props.filters.online);
const typeFilter = ref<string>(props.filters.type);
const groupFilter = ref<string>(props.filters.group);

watch(() => props.filters, f => {
  onlineFilter.value = f.online;
  typeFilter.value = f.type;
  groupFilter.value = f.group;
}, { deep: true });

function gatherAllDeviceTypes() {
  const set = new Set<string>(['All devices']);
  Object.values(devices.value).forEach(d => {
    if (d.info?.app) set.add(d.info.app);
  });
  return Array.from(set);
}

watch(visible, v => {
  if (!v) return;
  allOnline.value = ['All', 'Online', 'Offline'];
  allDeviceTypes.value = gatherAllDeviceTypes();
  allGroups.value = ['All groups', ...Object.values(groups.value).map(g => g.name)];
});

const defaultOnlineLabel = computed<string>(() =>
  onlineFilter.value === true ? 'Online' :
  onlineFilter.value === false ? 'Offline' :
  'All'
);

function onlineFilterSelected(val: string) {
  if (val === 'Online') onlineFilter.value = true;
  else if (val === 'Offline') onlineFilter.value = false;
  else onlineFilter.value = null;
}

function applyClicked() {
  const { filtered } = useDeviceFiltering(
    Object.values(devices.value),
    { online: onlineFilter.value, type: typeFilter.value, group: groupFilter.value }
  );
  emit('devices', filtered.value);
  emit('setFilters', {
    online: onlineFilter.value,
    type: typeFilter.value,
    group: groupFilter.value
  });
  visible.value = false;
}

function clearFilters() {
  onlineFilter.value = null;
  typeFilter.value = 'All devices';
  groupFilter.value = 'All groups';
  emit('devices', Object.values(devices.value));
  emit('setFilters', {
    online: onlineFilter.value,
    type: typeFilter.value,
    group: groupFilter.value
  });
  visible.value = false;
}

watch(devices, () => applyClicked());
</script>
