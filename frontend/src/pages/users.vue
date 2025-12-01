<template>
    <TabPageSelector :tabs="tabs" />
</template>

<script setup lang="ts">
import TabPageSelector from '@/components/core/TabPageSelector.vue';

const tabs: [string, string][] = [
    ['User Settings', '/users/manage-users'],
];
</script>
