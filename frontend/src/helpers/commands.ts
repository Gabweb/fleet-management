import { action_t, shelly_device_t } from '@/types';
import { useDevicesStore } from '@/stores/devices';
import { substituteVariables } from '@/helpers/substituteVariables';
import { sendRPC as httpSendRPC } from '@/tools/http';

async function runActionForDst(
  _device: shelly_device_t,
  dst: string,
  method: string,
  params: any
) {
  try {
    const resp = await httpSendRPC('fleetmanager.sendrpc', {
      dst,
      method,
      params: params ?? {},
    });

    const payload =
      resp && typeof resp === 'object' && dst in resp ? resp[dst] : resp;

    return { [dst]: payload };
  } catch (error: any) {
    if (error === undefined) {
      return { [dst]: { code: -1, message: 'RPC timeout' } };
    }
    if (typeof error === 'object' && 'code' in error) {
      return { [dst]: error };
    }
    return { [dst]: { code: -32700, message: String(error) } };
  }
}

export async function runAction(action: action_t) {
  const devicesStore = useDevicesStore();
  const rawSteps = action.actions || [];

  const steps = await Promise.all(
    rawSteps.map(async (step) => substituteVariables(step))
  );

  const promises: Promise<any>[] = [];
  for (const step of steps) {
    const { dst, method, params } = step as {
      dst: string | string[];
      method: string;
      params?: any;
    };

    const targets = Array.isArray(dst) ? dst : (dst ? [dst] : []);
    for (const d of targets) {
      const device = devicesStore.devices[d];
      promises.push(runActionForDst(device, d, method, params));
    }
  }

  const settled = await Promise.allSettled(promises);
  const results: Record<string, any> = {};
  for (const res of settled) {
    const value = 'value' in res ? res.value : res.reason;
    const key = Object.keys(value)[0]!;
    const payload = value[key];
    payload.__promiseStatus = res.status;
    results[key] = payload;
  }
  return results;
}