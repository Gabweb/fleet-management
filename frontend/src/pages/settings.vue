<template>
    <TabPageSelector :tabs="tabs" />
</template>

<script setup lang="ts">
import TabPageSelector from '@/components/core/TabPageSelector.vue';

const tabs: [string, string][] = [
    ['App Settings', '/settings/app'],
    ['User Settings', '/settings/user'],
    ['Plugins', '/settings/plugins'],
    ['Configurations', '/settings/configurations'],
    ['Action Variables', '/settings/action_variables'],
    ['Log', '/settings/log'],


];
</script>
