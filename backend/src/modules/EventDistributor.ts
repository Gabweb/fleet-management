import {getLogger} from 'log4js';
import type AbstractDevice from '../model/AbstractDevice';
import type CommandSender from '../model/CommandSender';
import * as Commander from '../modules/Commander';
import type {event_data_t, json_rpc_event} from '../types';
import {PluginNotifier} from './plugins';

type options_t = {allow: string[]; deny: string[]; shellyIDs: string[]};

let next_callback_id = 1;
const callback_ids = new Map<
    number,
    [CommandSender, options_t, event_callback_t]
>();
const event_map = new Map<string, number[]>(); // < EventName, Array of callback ids>
/**
 * Type Aliases:
 * Aliasing doesn’t actually create a new type - it creates a new name to refer to that type.
 * Aliasing a primitive is not terribly useful, though it can be used as a form of documentation.
 */
type callback_id = number; // type alias
type event_callback_t = <T extends json_rpc_event>(
    event: T,
    eventData: event_data_t
) => void;

const logger = getLogger('event-model');

export function addEventListener(
    sender: CommandSender,
    eventName: string,
    options: options_t,
    cb: event_callback_t
): callback_id {
    const callback_id = next_callback_id;
    callback_ids.set(callback_id, [sender, options, cb]);
    const listeners = event_map.get(eventName) || [];
    listeners.push(callback_id);
    event_map.set(eventName, listeners);
    next_callback_id++;
    return callback_id;
}

export function removeEventListener(
    callback_id: callback_id,
    eventName: string
) {
    if (callback_ids.has(callback_id)) {
        callback_ids.delete(callback_id);
    }
    if (!event_map.has(eventName)) return;
    const listeners = event_map.get(eventName) || [];
    const index = listeners.indexOf(callback_id);
    if (index > -1) {
        listeners.splice(index, 1);
    }
    if (listeners.length === 0) {
        event_map.delete(eventName);
    }
}

export async function processAndNotifyAll(
    event: json_rpc_event,
    eventData: event_data_t = {}
) {
    const device = eventData?.device;

    // just send non-device events
    if (!device) {
        return await notifyAll(event, eventData);
    }

    // send to metadata preprocessor
    try {
        // Add base metadata
        event.params.metadata = await generateMetadata(eventData.device!);
        const new_event = await PluginNotifier.sendForMetadata(
            event,
            eventData
        );
        return await notifyAll(new_event, eventData);
    } catch (err) {
        logger.error('failed to generate metadata err:[%s]', String(err));
        return await notifyAll(event, eventData);
    }
}

async function generateMetadata(device: AbstractDevice) {
    const shellyID = device.shellyID;
    const groups = await Commander.execInternal('Group.Find', {
        shellyID
    });
    return {
        ...device.meta,
        groups
    };
}

function matchesRule(reason: string, rule: string) {
    const [reasonCore, reasonComp] = reason.split(':');
    const [ruleCore, ruleComp] = rule.split(':');

    if (ruleCore === '*') {
        return ruleComp === '*' || reasonComp === ruleComp;
    }

    if (ruleComp === '*') {
        return reasonCore === ruleCore;
    }

    return reasonCore === ruleCore && reasonComp === ruleComp;
}

export async function notifyAll(
    event: json_rpc_event,
    eventData: event_data_t
) {
    const eventName = event.method;
    if (eventName !== 'Console.Log') {
        PluginNotifier.notifyEvent(event, eventData);
    }

    if (!event_map.has(eventName)) {
        // no listeners
        return;
    }
    const active_listeners: number[] = [];
    const listener_ids = event_map.get(eventName) || [];
    for (const callback_id of listener_ids) {
        if (callback_ids.has(callback_id)) {
            const bundle = callback_ids.get(callback_id);
            if (!bundle) continue;
            const [sender, options, cb] = bundle;

            active_listeners.push(callback_id);

            const {reason, device} = eventData;

            // Check device permission for device events
            if (device) {
                // Early return (continue in this case) if sender doesn't have permission
                try {
                    const hasAccess = await sender.canAccessDevice(
                        device.shellyID
                    );
                    if (!hasAccess) continue;
                } catch (error) {
                    continue;
                }
            }

            if (options) {
                if (
                    device &&
                    options.shellyIDs &&
                    Array.isArray(options.shellyIDs)
                ) {
                    if (!options.shellyIDs.includes(device.shellyID)) {
                        continue;
                    }
                }

                if (typeof reason === 'string') {
                    const {allow, deny} = options;
                    // Drop unwanted
                    if (deny && Array.isArray(deny)) {
                        if (
                            deny.find((rule: string) =>
                                matchesRule(reason, rule)
                            )
                        ) {
                            // logger.error("dropping msg bc of DENY rule", reason)
                            continue;
                        }
                    }
                    // Keep wanted
                    if (allow && Array.isArray(allow)) {
                        if (
                            !allow.find((rule: string) =>
                                matchesRule(reason, rule)
                            )
                        ) {
                            // logger.error("DROPPING msg bc of it is not in ALLOW rule", reason)
                            continue;
                        }
                    }
                }
            }

            // logger.info("SENDING MSG W/ REASON", reason)

            if (typeof cb === 'function') {
                cb(event, eventData);
            }
        }
    }
    if (active_listeners.length < listener_ids.length) {
        if (active_listeners.length === 0) {
            logger.mark('deleting event_name:[%s]', eventName);
            event_map.delete(eventName);
        } else {
            logger.mark(
                'removing %s listeners from event_name:[%s]',
                listener_ids.length - active_listeners.length,
                eventName
            );
            event_map.set(eventName, active_listeners);
        }
    }
}
