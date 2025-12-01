<template>
    <TabPageSelector :tabs="tabs" />
</template>

<script setup lang="ts">
import TabPageSelector from '@/components/core/TabPageSelector.vue';

const tabs: [string, string][] = [
    ['Devices', '/devices/devices'],
    ['Entities', '/devices/entities'],
    ['Groups', '/devices/groups'],
    // Removed for now, bc we are foxusing on SaaS
    // ['Discovered', '/devices/discovered'],
    ['Waiting Room', '/devices/waiting-room'],
];
</script>
