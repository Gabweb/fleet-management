import type {WebSocket} from 'ws';
import * as Commander from '../modules/Commander';

export default class CommandSender {
    private permissions: Set<string>;
    private group: string;
    private socket?: WebSocket;

    constructor(
        permissions: string[],
        group: string,
        additional?: {socket?: WebSocket}
    ) {
        this.permissions = new Set(permissions);
        this.group = group;
        this.socket = additional?.socket;
    }

    isAdmin() {
        return this.group === 'admin' || this.permissions.has('*');
    }

    hasPermission(permission: string): boolean {
        return this.isAdmin() || this.#hasPermissionRule(permission);
    }

    hasExactPermission(permission: string) {
        return this.isAdmin() || this.permissions.has(permission);
    }

    // TODO: make synchronous!
    async canAccessDevice(shellyId: string): Promise<boolean> {
        const hasDirectAccess = this.hasPermission(`device.get.${shellyId}`);
        return (
            hasDirectAccess || (await this.#isPartOfAnAccessedGroup(shellyId))
        );
    }

    async #isPartOfAnAccessedGroup(shellyID: string): Promise<boolean> {
        const groups: Record<
            PropertyKey,
            {
                id: number;
                name: string;
                devices: string[];
            }
        > = await Commander.exec(this, 'group.list');

        for (const group of Object.values(groups)) {
            if (group.devices.includes(shellyID)) {
                return true;
            }
        }

        return false;
    }

    #hasPermissionRule(requiredPermission: string) {
        const requiredParts = requiredPermission.split('.');
        if (requiredParts.length < 2) return false;

        for (const userPermission of this.permissions) {
            const userParts = userPermission.split('.');

            let match = true;
            for (let i = 0; i < requiredParts.length; i++) {
                if (userParts[i] === '*') {
                    match = true;
                    break;
                }
                if (
                    userParts[i]?.toLowerCase() !==
                    requiredParts[i]?.toLowerCase()
                ) {
                    match = false;
                    break;
                }
            }

            if (match) return true;
        }

        return false;
    }

    getSocket() {
        return this.socket;
    }

    toString() {
        return `CommandSender(${this.group})[${Array.from(this.permissions).join(',')}]`;
    }

    static readonly INTERNAL = new CommandSender(['*'], 'admin');
    static readonly PLUGIN = new CommandSender(['*'], 'plugins');
}
