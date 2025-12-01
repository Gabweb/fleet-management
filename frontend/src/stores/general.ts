import { FLEET_MANAGER_HTTP } from '@/constants';
import { getRegistry } from '@/tools/websocket';
import { defineStore } from 'pinia';
import { onMounted, ref } from 'vue';

export const useGeneralStore = defineStore('general', () => {
    const background = ref('');

    const solidColors = [
        '#FF0000',
        '#FFA500',
        '#FFFF00',
        '#008000',
        '#0000FF',
        '#4B0082',
        '#EE82EE',
        '#000000',
        '#808080',
        '#FFFFFF'
    ]

    const setBackgroundImg = async (newImg: string) => {
        await getRegistry('ui').setItem('backgroundImg', newImg);
        await getRegistry('ui').setItem('backgroundColor', null);
        background.value = newImg;
    };

    const setBackgroundColor = async (newColor: string) => {
        await getRegistry('ui').setItem('backgroundColor', newColor);
        await getRegistry('ui').setItem('backgroundImg', null);
        background.value = newColor;
    }

    async function setup() {
        try {
            const res = await getRegistry('ui').getAll<any>();
            background.value = res.backgroundColor || res.backgroundImg;
        } catch (e) {
            console.log('error in setup', e);
        }
    }
    onMounted(() => {
        setup();
    });

    return {
        setup,
        background,
        setBackgroundImg,
        setBackgroundColor,
        solidColors
    };
});
