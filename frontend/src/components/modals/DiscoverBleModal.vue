<template>
  <Modal :visible="showModal" @close="closeModal">
    <template #title>
      <span class="font-semibold">Discover BLE Devices</span>
      <div class="text-base font-semibold mt-4">
        <Steps :current="step" :steps="2" @click="goToStep">
          <template #stepTitle="{ id }">
            <span v-if="id === STEPS.SELECT_DEVICE_TO_SCAN">Select Gateways</span>
            <span v-if="id === STEPS.RESULTS">Select BLE Devices &amp; Sensors</span>
          </template>
        </Steps>
      </div>
    </template>

    <template #default>
      <div class="space-y-6">
        <!-- Step 1 -->
        <template v-if="step === STEPS.SELECT_DEVICE_TO_SCAN">
          <BasicBlock bordered custom-class="widget-grid-entities">
            <div class="my-2">
              <h2 class="text-2xl font-bold">Step 1: Select Gateways</h2>
            </div>
            <hr class="my-4" />
            <MultipleSelector v-model="selectedScanners" :options="allGateways" />
          </BasicBlock>
        </template>

        <!-- Step 2 -->
        <template v-else-if="step === STEPS.RESULTS">
          <BasicBlock class="space-y-6">
            <div class="my-2">
              <h2 class="text-2xl font-bold">Step 2: Select BLE Devices</h2>
            </div>
            <hr class="my-4" />

            <!-- Discovery notice -->
            <Notification v-if="!manualInProgress && !sensorsLoaded && !sensorsLoading">
              Discovery started. Hold device button for 10 seconds.
            </Notification>

            <!-- Discovered devices list -->
            <BasicBlock
              v-if="!manualInProgress && !sensorsLoaded && selectableBleDevices.length > 0"
              darker
            >
              <MultipleSelector
                v-model="selectedBleDevices"
                :options="selectableBleDevices"
              />
            </BasicBlock>

            <hr class="my-4" />

            <!-- Manual add device -->
            <div>
              <Button size="sm" type="blue-hollow" @click="manualOpen = !manualOpen">
                {{ manualOpen ? 'Hide Manual Add' : 'Add BLE Device Manually' }}
              </Button>
              <div v-if="manualOpen" class="mt-4 space-y-2">
                <Input v-model="manualMac" placeholder="MAC address" clear />
                <Input v-model="manualName" placeholder="(Optional) name" clear />
                <Button
                  size="sm"
                  type="green"
                  :disabled="!manualMac || manualInProgress"
                  @click="addManual"
                >
                  Add
                </Button>
                <Notification v-if="manualInProgress && !sensorsLoading" type="info">
                  Manual addition may take around 40 seconds…
                </Notification>
                <Notification v-if="manualSuccess" type="success">{{ manualSuccess }}</Notification>
                <Notification v-if="manualError"   type="warning">{{ manualError   }}</Notification>
              </div>
            </div>

            <!-- Loading sensors notice -->
            <Notification v-if="sensorsLoading" type="info">
              Devices added successfully! Waiting up to 1 minute for sensors to appear. You can force
              discovery by pressing the button on the gateway.
            </Notification>

            <!-- Sensor list for each gateway -->
            <div v-if="sensorsLoaded" class="space-y-4">
              <hr class="my-4" />
              <div v-for="gw in selectedScanners" :key="gw.shellyID">
                <h3 class="font-semibold">{{ gw.name }}</h3>
                <ul class="list-disc list-inside">
                  <li
                    v-for="sensor in sensorsByGateway[gw.shellyID] || []"
                    :key="sensor.addr + '-' + sensor.obj_id + '-' + sensor.idx"
                    class="flex items-center justify-between"
                  >
                    <span>
                      {{ getSensorLabel(sensor) }}
                      <small>(obj {{ sensor.obj_id }}, idx {{ sensor.idx }})</small>
                    </span>
                    <Button
                      size="xs"
                      type="blue-hollow"
                      @click="addSensor(gw.shellyID, sensor)"
                    >
                      <i class="fas fa-plus" />
                    </Button>
                  </li>
                </ul>
              </div>
            </div>
          </BasicBlock>
        </template>
      </div>
    </template>

    <template #footer>
      <div class="flex flex-row-reverse gap-4">
        <Button
          v-if="step === STEPS.RESULTS && !sensorsLoaded"
          type="blue"
          :disabled="(selectedBleDevices.length === 0 && !manualSuccess) || manualInProgress"
          @click="addDevices"
        >
          Add Devices <i class="fas fa-save" />
        </Button>

        <Button
          v-if="step === STEPS.SELECT_DEVICE_TO_SCAN"
          type="blue"
          :disabled="selectedScanners.length === 0"
          @click="startScan"
        >
          Start Scan <i class="fas fa-chevron-right" />
        </Button>

        <Button
          v-if="step > STEPS.SELECT_DEVICE_TO_SCAN"
          type="blue-hollow"
          @click="goBack"
        >
          <i class="fas fa-chevron-left" /> Back
        </Button>
      </div>
    </template>
  </Modal>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import Modal from '@/components/modals/Modal.vue';
import Button from '@/components/core/Button.vue';
import Steps from '@/components/core/Steps.vue';
import BasicBlock from '@/components/core/BasicBlock.vue';
import MultipleSelector from '@/components/MultipleSelector.vue';
import Notification from '@/components/core/Notification.vue';
import Input from '@/components/core/Input.vue';
import { useBTHomeDevicesStore } from '@/stores/bthome-devices';
import { useDevicesStore } from '@/stores/devices';
import { getDeviceName, getLogo, getLogoFromModel } from '@/helpers/device';
import { sendRPC, addBTHomeDevices } from '@/tools/websocket';
import { useToastStore } from '@/stores/toast';
import type { shelly_bthome_result_t } from '@/types';

interface SelectedGateway {
  shellyID: string;
  name: string;
  pictureUrl: string;
}

interface SensorDef {
  id:   number;
  addr: string;
  obj_id: number;
  idx: number;
  type: string;
  name?: string;
  meta?: any;
}

const OBJ_ID_LABELS: Record<number, string> = {
  1:  'Battery Level',
  5:  'Rotation Sensor',
  45: 'Window Sensor',
  58: 'Light (Illuminance) Sensor',
  63: 'Button',
};

function getSensorLabel(sensor: SensorDef): string {
  const comp = sensor.type?.toLowerCase();
  if (OBJ_ID_LABELS[sensor.obj_id]) {
    return OBJ_ID_LABELS[sensor.obj_id];
  }
  return `Unknown (obj ${sensor.obj_id})`;
}

const STEPS = { SELECT_DEVICE_TO_SCAN: 1, RESULTS: 2 } as const;

const step              = ref<number>(STEPS.SELECT_DEVICE_TO_SCAN);
const showModal         = ref(true);
const manualOpen        = ref(false);
const manualMac         = ref('');
const manualName        = ref('');
const manualInProgress  = ref(false);
const manualError       = ref<string | null>(null);
const manualSuccess     = ref<string | null>(null);
const sensorsLoading    = ref(false);
const sensorsLoaded     = ref(false);
const sensorsByGateway  = ref<Record<string, SensorDef[]>>({});

const bthomeDevicesStore = useBTHomeDevicesStore();
const deviceStore        = useDevicesStore();
const toastStore         = useToastStore();

const selectedScanners   = ref<SelectedGateway[]>([]);
const selectedBleDevices = ref<
  { name: string; pictureUrl: string; _meta: shelly_bthome_result_t }[]
>([]);

let mac = ref<string>('');

const allGateways = computed(() =>
  Object.values(deviceStore.devices)
    .filter(d => d.info.gen >= 3 && d.online)
    .map(d => ({
      shellyID:   d.shellyID,
      name:       getDeviceName(d.info),
      pictureUrl: getLogo(d),
    }))
);

const selectableBleDevices = computed(() =>
  bthomeDevicesStore.bthome_devices.map(dev => ({
    name:       `${dev.type} (${dev.mac})`,
    pictureUrl: getLogoFromModel(dev.type),
    _meta:      dev,
  }))
);

async function startScan() {
  if (!selectedScanners.value.length) {
    toastStore.error('No BLE scanners selected');
    return;
  }
  try {
    await sendRPC('FLEET_MANAGER', 'Device.StartDeviceDiscovery', {
      shellyIds: selectedScanners.value.map(s => s.shellyID),
      duration: 60
    });
    bthomeDevicesStore.startDiscovery();
    step.value = STEPS.RESULTS;
  } catch (err) {
    toastStore.error(String(err));
  }
}

async function addDevices() {
  if (!selectedBleDevices.value.length) {
    toastStore.error('No devices selected to add.');
    return;
  }
  sensorsLoading.value = true;
  try {
    await addBTHomeDevices(selectedBleDevices.value.map(d => d._meta));
    toastStore.success(`Adding ${selectedBleDevices.value.length} BLE devices…`);

    await loadSensors();
  } catch (err: any) {
    toastStore.error(err?.message ?? String(err));
    sensorsLoading.value = false;
  }
}

async function addManual() {
  manualError.value      = null;
  manualSuccess.value    = null;
  manualInProgress.value = true;
  mac.value = manualMac.value.trim().toLowerCase();
  try {
    await Promise.all(
      selectedScanners.value.map(s =>
        sendRPC('FLEET_MANAGER', 'device.AddBTHomeDeviceManual', {
          shellyID: s.shellyID,
          mac:      manualMac.value,
          name:     manualName.value || undefined
        },
        { timeoutMs: 50_000 })
      )
    );
    manualSuccess.value = `Manual BLE device addition succeeded! Click the device's button to discover its sensors in the next 15 seconds.`;

    sensorsLoading.value = true;
    await new Promise(resolve => setTimeout(resolve, 15_000));
    await loadSensors();
  } catch (err: any) {
    console.error('Manual addition error:', err);
    manualError.value = err?.message ?? 'Manual addition failed.';
    sensorsLoading.value = false;
  } finally {
    manualInProgress.value = false;
  }
}

async function loadSensors() {
  sensorsLoaded.value     = false;
  sensorsByGateway.value  = {};

  await Promise.all(
    selectedScanners.value.map(async gw => {
      try {
        const list: SensorDef[] = await sendRPC(
          'FLEET_MANAGER',
          'device.GetBTHomeDeviceKnownObjects',
          { shellyID: gw.shellyID, mac: mac.value }
        );
        sensorsByGateway.value[gw.shellyID] = list;
      } catch {
        sensorsByGateway.value[gw.shellyID] = [];
      }
    })
  );

  sensorsLoading.value = false;
  sensorsLoaded.value  = true;
}

async function addSensor(gatewayID: string, s: SensorDef) {
  try {
    await sendRPC('FLEET_MANAGER', 'device.AddBTHomeSensor', {
      shellyID: gatewayID,
      id:        s.id,
      addr:     s.addr,
      obj_id:   s.obj_id,
      idx:      s.idx,
      name:     s.name,
      meta:     s.meta
    });
    toastStore.success('Sensor added!');
    await loadSensors();
  } catch (e: any) {
    toastStore.error(`Failed to add sensor: ${e?.message ?? e}`);
  }
}

function goBack() {
  step.value               = STEPS.SELECT_DEVICE_TO_SCAN;
  selectedBleDevices.value = [];
  sensorsLoaded.value      = false;
}

function closeModal() {
  showModal.value = false;
}

function goToStep(n: number) {
  if (n < step.value) step.value = n;
}
</script>
