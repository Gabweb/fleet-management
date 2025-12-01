<template>
  <div class="p-4 w-full h-full overflow-auto">
    <h2 class="text-2xl font-bold">{{ sensorName }}</h2>
    <h3 class="text-lg font-semibold mt-4">Gateways:</h3>
    <div class="grid w-full gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 mt-2">
      <div
        v-for="dev in gateways"
        :key="dev.shellyID"
        class="relative group flex flex-col items-center max-w-full"
      >
        <DeviceWidget
          :device-id="dev.shellyID"
          vertical
          class="w-full h-32"
        />
        <button
          @click.stop="confirmUnlink(dev)"
          class="absolute top-1 right-1 text-red-500 hover:text-red-700 z-10"
        >
          <i class="fas fa-trash"></i>
        </button>
        <div
          class="mt-2 text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-normal break-words w-full text-center leading-tight"
        >
          {{ dev.shellyID }}
        </div>
      </div>
    </div>

    <ConfirmationModal ref="confirmModal">
      <template #title>
        <h1>Unlink sensor from gateway?</h1>
      </template>
      <p class="p-4">
        Remove sensor <strong>{{ sensorName }}</strong> from gateway
        <strong>{{ toRemove?.shellyID }}</strong>?
      </p>
    </ConfirmationModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { sendRPC } from '@/tools/websocket'
import DeviceWidget from '@/components/widgets/DeviceWidget.vue'
import ConfirmationModal from '@/components/modals/ConfirmationModal.vue'
import { useDevicesStore } from '@/stores/devices'

const props = defineProps<{
  sensorId: string
  sensorName: string
}>()

const devicesStore = useDevicesStore()
const confirmModal = ref<InstanceType<typeof ConfirmationModal> | null>(null)
const toRemove = ref<{ shellyID: string } | null>(null)

const gateways = computed(() =>
  Object.values(devicesStore.devices).filter(dev =>
    Object.entries(dev.settings).some(
      ([key, cfg]) =>
        key.startsWith('bthomedevice:') &&
        (cfg as any).addr === props.sensorId
    )
  )
)

function confirmUnlink(dev: { shellyID: string; settings: Record<string, any> }) {
  toRemove.value = dev;
  confirmModal.value?.storeAction(async () => {
    const compKey = Object.keys(dev.settings).find(
      key =>
        key.startsWith('bthomedevice:') &&
        (dev.settings[key] as any).addr === props.sensorId
    );
    if (!compKey) {
      console.error('Could not find component ID for sensor', props.sensorId);
      return;
    }
    const id = parseInt(compKey.split(':')[1], 10);
    try {
      await sendRPC('FLEET_MANAGER', 'device.RemoveBTHomeDevice', {
        shellyID: dev.shellyID,
        id
      });
    } catch (err) {
      console.error('Failed to unlink sensor', err);
    }
  });
}

</script>

