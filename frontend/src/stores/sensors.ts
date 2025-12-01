import { defineStore } from 'pinia';
import { computed } from 'vue';
import { useDevicesStore } from './devices';

export type SensorDevice = {
    id: string;
    name: string;
    state?: 'open' | 'closed';
    battery?: number;
    kind: 'door_window' | 'button' | 'remote_controller' | 'motion_sensor';
};

export const useSensorsStore = defineStore('sensors', () => {
    const devicesStore = useDevicesStore();

    const sensors = computed<SensorDevice[]>(() => {
        const byMac = new Map<
            string,
            {
                name: string;
                doorValue?: boolean;
                doorTs?: number;
                battery?: number;
                batteryTs?: number;
                motionValue?: boolean;
                motionTs?: number;
                objIds: Set<number>;
            }
        >();

        const deviceNames = new Map<string, string>();

        for (const dev of Object.values(devicesStore.devices)) {
            const settings = dev.settings as Record<string, any>;
            for (const key of Object.keys(settings)) {
                if (!key.startsWith('bthomedevice:')) continue;
                const dcfg = settings[key] as { addr: string; name?: string };
                if (dcfg.name?.trim()) {
                    deviceNames.set(dcfg.addr, dcfg.name.trim());
                }
            }
        }

        for (const dev of Object.values(devicesStore.devices)) {
            const settings = dev.settings as Record<string, any>;
            const status = dev.status as Record<string, any>;

            for (const key of Object.keys(settings)) {
                if (!key.startsWith('bthomesensor:')) continue;

                const cfg = settings[key] as {
                    id: number;
                    addr: string;
                    name?: string;
                    obj_id: number;
                    idx: number;
                };

                const mac = cfg.addr;
                const label = cfg.name?.trim() || deviceNames.get(mac) || mac;
                const stat = status[`bthomesensor:${cfg.id}`] as
                    | { value: any; last_updated_ts?: number }
                    | undefined;
                if (!stat) continue;

                const ts = stat.last_updated_ts ?? 0;
                const val = stat.value;

                let agg = byMac.get(mac);
                if (!agg) {
                    agg = { name: label, objIds: new Set<number>() };
                    byMac.set(mac, agg);
                }
                agg.objIds.add(cfg.obj_id);

                if (cfg.obj_id === 45 && typeof val === 'boolean') {
                    if (agg.doorTs === undefined || ts > agg.doorTs) {
                        agg.doorValue = val;
                        agg.doorTs = ts;
                        agg.name = label;
                    }
                } else if (cfg.obj_id === 1 && typeof val === 'number') {
                    if (agg.batteryTs === undefined || ts > agg.batteryTs) {
                        agg.battery = val;
                        agg.batteryTs = ts;
                    }
                } else if (cfg.obj_id === 33 && typeof val === 'boolean') {
                    if (agg.motionTs === undefined || ts > agg.motionTs) {
                        agg.motionValue = val;
                        agg.motionTs = ts;
                    }
                }
            }
        }

        return Array.from(byMac.entries()).map(([mac, agg]) => {
            let kind: SensorDevice['kind'] = 'button';

            if (agg.objIds.has(45)) {
                kind = 'door_window';
            } else if (agg.objIds.has(33)) {
                kind = 'motion_sensor';
            } else if (
                agg.name.toLowerCase().includes('rc') ||
                agg.name.toLowerCase().includes('remote')
            ) {
                kind = 'remote_controller';
            }

            return {
                id: mac,
                name: agg.name,
                battery: agg.battery,
                kind,
                // door/window
                ...(kind === 'door_window' && agg.doorValue !== undefined
                    ? { state: agg.doorValue ? 'open' : 'closed' }
                    : {}),
                // motion sensor
                ...(kind === 'motion_sensor' && agg.motionValue !== undefined
                    ? { state: agg.motionValue ? 'open' : 'closed' }
                    : {}),
            };
        });
    });

    function getLogo(device?: SensorDevice) {
        if (!device) return '/shelly_logo_black.jpg';
        switch (device.kind) {
            case 'door_window': return '/door_window.png';
            case 'button': return '/button.png';
            case 'remote_controller': return '/rc.png';
            case 'motion_sensor': return '/motion.png';
            default: return '/shelly_logo_black.jpg';
        }
    }

    return { sensors, getLogo };
});
