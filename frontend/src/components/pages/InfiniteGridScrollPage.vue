<template>
    <div class="infinite-grid-scroll-page overflow-hidden relative flex flex-col h-full">
        <slot name="header" />
        <div ref="rootElement" class="overflow-y-scroll h-full">
            <slot v-if="items.length == 0" name="empty" />
            <div v-else ref="gridElem" :class="[small ? 'flex flex-col gap-2 pb-16' : 'widget-grid pb-2', customClass? customClass : '']">
                <template v-for="(item, index) in items">
                    <slot :item="item" :small="small" :item_index="index" />
                </template>
            </div>
            <div v-if="page < totalPages" class="my-4 relative h-8 pb-2 hidden md:block">
                <Spinner class="absolute left-1/2" />
                <Button class="absolute right-4" @click="emit('load-items')"> Force load </Button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts" generic="T">
import { ref, toRefs, watch } from 'vue';
import { useScroll } from '@vueuse/core';
import Spinner from '@/components/core/Spinner.vue';
import Button from '@/components/core/Button.vue';
import { small } from '@/helpers/ui';

const items = defineModel<T[]>('items', { required: true });
const page = defineModel<number>('page', { required: true });
const totalPages = defineModel<number>('totalPages', { required: true });
const props = defineProps<{ customClass?: string }>();

const {customClass}=toRefs(props)

const emit = defineEmits<{
    'load-items': [];
}>();

const rootElement = ref<HTMLElement | null>(null);
const gridElem = ref<HTMLElement | null>(null);

const { isScrolling } = useScroll(rootElement);

function checkVisible(elm: any) {
    if (typeof elm.getBoundingClientRect !== 'function') return false;
    const rect = elm.getBoundingClientRect();
    const viewHeight = Math.max(document.documentElement.clientHeight, window.innerHeight);
    return !(rect.bottom < 0 || rect.top - viewHeight >= 0);
}

function handleScroll() {
    const element = gridElem.value;
    if (!element || !element.lastElementChild) return;
    const lastElemVisible = checkVisible(element.lastElementChild);
    if (lastElemVisible && page.value <= totalPages.value) {
        emit('load-items');
    }
}

watch(isScrolling, (isScrolling) => {
    if (isScrolling) {
        handleScroll();
    }
});

// Prevent scroll remembering
if (history.scrollRestoration) {
    history.scrollRestoration = 'manual';
}
</script>
