<template>
    <TabPageSelector :tabs="tabs" />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import TabPageSelector from '@/components/core/TabPageSelector.vue';
import { sendRPC } from '@/tools/websocket';

const tabs = ref<[string, string][]>([['Actions', '/automations/actions']]);

onMounted(async () => {
  try {
    const config = await sendRPC('FLEET_MANAGER', 'Storage.GetUIConfig', {});
    const nodeRedEnabled = config.find((item: any) => item.name === 'node_red_enable')?.icon_path;
    if (nodeRedEnabled) {
      tabs.value.push(['Node Red', '/automations/node-red']);
    }
  } catch (error) {
    console.error('Failed to fetch config:', error);
  }
});

</script>
