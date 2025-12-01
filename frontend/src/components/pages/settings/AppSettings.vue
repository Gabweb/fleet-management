<template>
    <BasicBlock darker>
        <div class="container">
            <h2 class="mb-4 capitalize text-2xl font-bold">Change App Background</h2>

            <!-- Upload Section -->
            <div class="mb-6">
                <p class="mb-4 text-sm font-medium">Custom Picture</p>
                <div class="flex items-center space-x-4">
                    <label for="file-upload"
                        class="flex items-center px-4 py-2 space-x-2 text-white bg-blue-500 rounded cursor-pointer hover:bg-blue-600">
                        <i class="fa-solid fa-upload"></i>
                        <span>Upload Picture</span>
                    </label>
                    <input id="file-upload" class="hidden-input" type="file" capture accept=".jpg, .jpeg, .png"
                        @change="handleFileUpload" />
                </div>
            </div>

            <!-- Gallery Section -->
            <BasicBlock title-padding>
                <p class="mb-4 text-sm font-medium">Gallery Backgrounds</p>
                <div class="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-12 gap-4">
                    <div v-for="(thumb, index) in thumbnails" :key="index">
                        <div class="relative w-20 h-20 bg-cover bg-center border-2 rounded-full group"
                            :style="{ backgroundImage: `url(${thumb})` }" :class="{
                                'border-blue-500': isSelectedAsBackground(index),
                                'border-gray-300': !isSelectedAsBackground(index),
                            }" @click="handleBackgroundChange(index, thumb)">
                            <span v-if="isSelectedAsBackground(index)"
                                class="absolute top-1 left-1 text-white bg-blue-500 rounded-full p-1">
                                <i class="fas fa-check"></i>
                            </span>
                            <button @click.stop="deleteBackground(index)"
                                class="absolute top-0 right-0 text-white bg-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <i class="fas fa-remove"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </BasicBlock>
            <BasicBlock title-padding>
                <p class="mb-4 text-sm font-medium">Solid Colors</p>
                <div class="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-12 gap-4">
                    <div v-for="color in solidColors" :key="color">
                        <div class="relative w-20 h-20 bg-cover bg-center border-2 rounded-full group"
                            :style="{ backgroundColor: color }" :class="{
                                'border-blue-500': selectedColor === color,
                                'border-gray-300': selectedColor !== color,
                            }" @click="handleBackgroundChange(null, null, color)">
                            <span v-if="selectedColor === color"
                                class="absolute top-1 left-1 text-white bg-blue-500 rounded-full p-1">
                                <i class="fas fa-check"></i>
                            </span>
                        </div>
                    </div>
                </div>
            </BasicBlock>
        </div>
        <ConfirmationModal ref='modalRefChange'>
            <template #title>
                <h1>You are about to change the background! <br> Proceed?</h1>
            </template>
            <template #footer>
            </template>
        </ConfirmationModal>
        <ConfirmationModal footer ref='modalRefDelete'>
            <template #title>
                <h1>You are about to delete a background! <br> Proceed?</h1>
            </template>
            <template #footer>
            </template>
        </ConfirmationModal>
    </BasicBlock>
</template>

<script setup lang="ts">
import apiClient from '@/helpers/axios';
import BasicBlock from '@/components/core/BasicBlock.vue';
import { onMounted, ref, computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useToastStore } from '@/stores/toast';
import { useGeneralStore } from '@/stores/general';
import { FLEET_MANAGER_HTTP } from '@/constants';
import ConfirmationModal from '@/components/modals/ConfirmationModal.vue';

const toast = useToastStore();
const generalStore = useGeneralStore();
const { setBackgroundImg, setBackgroundColor, solidColors } = generalStore;
const { background } = storeToRefs(generalStore);

// State variables
const thumbnails = ref<string[]>([]);
const originals = ref<string[]>([]);
const selectedIndex = ref<number | null>(null);
const selectedColor = ref<string | null>(background.value);
const selectedBackground = ref<string | null>(background.value);
const fileProfile = ref<File | null>(null);
const modalRefChange = ref<InstanceType<typeof ConfirmationModal>>();
const modalRefDelete = ref<InstanceType<typeof ConfirmationModal>>();

const basePath = FLEET_MANAGER_HTTP + '/uploads/backgrounds';

const loadImages = async () => {
    try {
        const response = await apiClient.get('/media/getAllBackgrounds');

        // Map thumbnails and originals to backend URLs
        thumbnails.value = response.data.thumbnails.map((file: string) => `${basePath}/${file}`);
        originals.value = response.data.originals.map((file: string) => `${basePath}/${file}`);

        // Update the selected background based on the store value
        if (!background.value || background.value === 'undefined' || background.value == null) {
            selectBackground(0, "http://localhost:7011/uploads/backgrounds/app_bg_01_thumb.png");
        } else if (background.value.includes('#')) {
            selectedColor.value = background.value;
            selectedIndex.value = null;
        } else if (background.value.includes('uploads')) {
            selectedBackground.value = background.value;
            selectedIndex.value = originals.value.indexOf(background.value);
        }
    } catch (err) {
        console.error('Failed to load images', err);
    }
};
watch(
    [() => background.value, () => originals.value],
    ([bg, orig]) => {
        if (orig && orig.length > 0) {
            if (!bg || bg === 'undefined') {
                selectedBackground.value = orig[0];
                selectedIndex.value = 0;
            } else if (bg.includes('#')) {
                selectedColor.value = bg;
                selectedIndex.value = null;
            } else if (bg.includes('uploads')) {
                selectedBackground.value = bg;
                selectedIndex.value = orig.indexOf(bg);
            }
        }
    },
    { immediate: true }
);

const isSelectedAsBackground = computed(() => (index: number) => {
    return selectedIndex.value === index;
});

const selectBackground = async (index: number, thumb: string) => {
    selectedIndex.value = index;
    // Replace the thumbnail URL to get the original image URL if needed
    selectedBackground.value = new URL(`${thumb.replace('_thumb', '')}`, import.meta.url).href;
    selectedColor.value = null;
    await setBackgroundImg(selectedBackground.value);
    await loadImages();
    toast.success('Background changed successfully');
};

const selectBackgroundColor = async (color: string) => {
    selectedColor.value = color;
    selectedBackground.value = null;
    selectedIndex.value = null;
    await setBackgroundColor(selectedColor.value);
    await loadImages();
    toast.success('Background changed successfully');
};

const handleFileUpload = async ($event: Event) => {
    const input = $event.target as HTMLInputElement;
    if (input && input.files) {
        const originalFile = input.files[0];
        const fileExtension = originalFile.name.split('.').pop();
        const newFileName = `app_bg_${originals.value.length}.${fileExtension}`;
        const renamedFile = new File([originalFile], newFileName, { type: originalFile.type });
        fileProfile.value = renamedFile;

        const formData = new FormData();
        formData.append('image', renamedFile);

        try {
            const response = await apiClient.post('/media/uploadBackgroud', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            if (response.data.success) {
                await loadImages();
            }
        } catch (err) {
            console.error('Failed to upload image', err);
        }
    } else {
        toast.error('No file selected');
    }
};

function deleteBackground(image: number) {
    if (modalRefDelete.value) {
        modalRefDelete.value.storeAction(async () => {
            const fileName = originals.value[image].split('/').pop();
            apiClient.post(`/media/deleteBackground`, { fileName })
                .then(() => loadImages())
                .catch((err) => console.error('Failed to delete image', err));
        });
    }
}

function handleBackgroundChange(index?: number | null, thumb?: string | null, color?: string | null) {
    if (modalRefChange.value) {
        modalRefChange.value.storeAction(async () => {
            if (index !== null && index !== undefined && thumb) {
                await selectBackground(index, thumb);
            } else if (color) {
                await selectBackgroundColor(color);
            }
        });
    }
}

// Lifecycle hook to initialize thumbnails
onMounted(async () => {
    await loadImages();
});
</script>

<style scoped>
.hidden-input {
    display: none;
}
</style>
