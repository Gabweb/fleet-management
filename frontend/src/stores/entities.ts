import { defineStore } from 'pinia';
import * as ws from '../tools/websocket';
import { entity_t } from '../types';
import { shallowRef, triggerRef } from 'vue';

export const useEntityStore = defineStore('entities', () => {
    const entities = shallowRef<Record<string, entity_t>>({});
    const eventListeners: Map<string, Array<(event: string) => void>> = new Map<
        string,
        Array<(event: string) => void>
    >();

    async function fetchEntities() {
        entities.value = await ws.listEntities();
    }

    async function addEntity(id: string) {
        const entity = await ws.getEntityInfo(id);
        if (entity) {
            entities.value[entity.id] = entity;
            triggerRef(entities);
        }
    }

    async function removeEntities(oldEntities: string[]) {
        for (const id of oldEntities) {
            delete entities.value[id];
        }
        triggerRef(entities);
    }

    async function updateEntity(entityID: string) {
        return await addEntity(entityID);
    }

    async function sendRPC(entityID: string, method: string, params?: any) {
        const entity = entities.value[entityID];
        if (entity == undefined) {
            return Promise.reject('Entity not found');
        }

        if (method.split('.')[0].toLocaleLowerCase() !== entity.type.toLocaleLowerCase()) {
            return Promise.reject('Method not supported by entity');
        }

        if (params == undefined) {
            params = {};
        }

        params['id'] = 'id' in entity.properties ? entity.properties.id : 0;

        return ws.sendRPC(entity.source, method, params);
    }

    function addListener(entityId: string, callback: (event: string) => void) {
        if (!eventListeners.has(entityId)) {
            eventListeners.set(entityId, []);
        }

        eventListeners.get(entityId)?.push(callback);

        return () => removeListener(entityId, callback);
    }

    function removeListener(entityId: string, callback: (event: string) => void) {
        const listeners = eventListeners.get(entityId);

        if (!listeners) {
            return;
        }

        const index = listeners.indexOf(callback);
        if (index !== -1) {
            listeners.splice(index, 1);
        }
    }

    function notifyEvent(entityId: string, event: 'single_push' | 'double_push' | 'long_push') {
        const listeners = eventListeners.get(entityId);

        if (!listeners) {
            return;
        }

        for (const listener of listeners) {
            listener(event);
        }
    }

    return {
        entities,
        fetchEntities,
        sendRPC,
        addEntity,
        removeEntities,
        updateEntity,
        notifyEvent,
        addListener,
    } as const;
});
