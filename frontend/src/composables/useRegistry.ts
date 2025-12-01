import { Ref, ref } from 'vue';
import * as ws from '../tools/websocket';
import { getRegistry, sendRPC } from '@/tools/websocket';

function storeData(prefix: string, key: string, data: object) {
    localStorage.setItem(prefix + key, JSON.stringify(data));
}

function loadData<T>(prefix: string, key: string): T | null {
    try {
        const raw = localStorage.getItem(prefix + key);
        if (!raw) return null;
        return JSON.parse(raw) as T;
    } catch (error) {
        return null;
    }
}

export default function useRegistry<T extends {}>(registry: string, key: string) {
    const prefix = `${registry}-registry-cache:`;
    const data = ref<T | null>(loadData<T>(prefix, key)) as Ref<T | null>;
    const loading = ref(true);
    const error = ref(false);

    const UIRegistry = ws.getRegistry(registry);

    async function execute() {
        loading.value = data.value == null;
        error.value = false;
        try {
            const item = await UIRegistry.getItem<T>(key);
            data.value = item;
            storeData(prefix, key, item);
        } catch (err) {
            error.value = true;
        } finally {
            loading.value = false;
        }
    }

    function refresh() {
        data.value = null;
        return execute();
    }

    async function upload() {
        await getRegistry('ui').setItem('dashboards', {id:key,items:data.value});
        await UIRegistry.setItem(key, data.value);
        await refresh();
    }



    // run once
    execute();

    return {
        data,
        loading,
        error,
        refresh,
        upload,
    };
}
