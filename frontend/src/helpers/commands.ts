import { action_t } from '@/types';
import * as ws from '@/tools/websocket';

export async function runAction(action: action_t) {
    const actions = action.actions;
    if (!actions) return;
    for (const action of actions as any[]) {
        await ws.sendRPC(action.dst, action.method, action.params);
    }
}
