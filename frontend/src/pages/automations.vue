<template>
    <TabPageSelector :tabs="tabs" />
</template>

<script setup lang="ts">
import TabPageSelector from '@/components/core/TabPageSelector.vue';

const tabs: [string, string][] = [
    ['Actions', '/automations/actions'],
    ['Node Red', '/automations/node-red'],
];
</script>
