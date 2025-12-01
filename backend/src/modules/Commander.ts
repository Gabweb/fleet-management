import log4js from 'log4js';
import CommandSender from '../model/CommandSender';
import type Component from '../model/component/Component';
import RpcError from '../rpc/RpcError';
const logger = log4js.getLogger('Commander');

const components: Map<string, Component> = new Map();

/**
 * Accepts RPC requests and executes them
 * @returns The result of the RPC call if successful
 * @throws An RPC error, not a JS error
 */
export async function exec(
    sender: CommandSender,
    method: string,
    params?: any
): Promise<any> {
    method = method.toLowerCase();

    try {
        if (!method.includes('.')) {
            throw RpcError.InvalidRequest("Method must include '.'");
        }

        const [componentName, submethod] = method.split('.', 2);
        const component = components.get(componentName);
        if (component === undefined) {
            throw RpcError.MethodNotFound();
        }

        return await component.call(sender, submethod, params);
    } catch (error: any) {
        if (error instanceof RpcError) {
            throw error.getErrorObject();
        }

        logger.error('Somehow got non-rpc error', error);

        throw RpcError.fromError(error).getErrorObject();
    }
}

export async function execInternal(method: string, params?: any) {
    return await exec(CommandSender.INTERNAL, method, params);
}

export function registerComponent<T extends Component>(
    component: T,
    allowOverride = false
) {
    const name = component.name.toLowerCase();
    if (components.has(name)) {
        if (!allowOverride) return;
        logger.warn('Overriding component %s', name);
    }
    logger.info(
        "Registering component '%s' with methods:[%s]",
        component.name,
        String(component.listMethods())
    );
    components.set(name, component);
}

export function deleteComponent(name: string) {
    components.delete(name);
}

export function getComponent(name: string) {
    return components.get(name);
}

export function getComponents() {
    return components;
}

export function listCommands() {
    return Array.from(components.keys());
}

export async function getConfig(name: string) {
    const component = getComponent(name);
    if (component === undefined) {
        return {};
    }
    return component.getConfig();
}

export async function getStatus(name: string) {
    const component = getComponent(name);
    if (component === undefined) {
        return {};
    }
    return component.getStatus();
}
