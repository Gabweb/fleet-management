import * as ws from '@/tools/websocket';
import { ref } from 'vue';

export default function useWsRpc<T>(method: string, params: Record<string, any> = {}) {
    const data = ref<T | null>();
    const loading = ref(true);
    const error = ref(false);

    function execute() {
        loading.value = true;
        error.value = false;
        data.value = null;
        ws.sendRPC('FLEET_MANAGER', method, params)
            .then(
                (res) => {
                    data.value = res;
                },
                () => {
                    error.value = true;
                }
            )
            .finally(() => {
                loading.value = false;
            });
    }

    // run once
    execute();

    function refresh() {
        return execute();
    }

    return {
        data,
        loading,
        error,
        refresh,
    };
}
