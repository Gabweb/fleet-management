import {accessControl} from '../../modules/PostgresProvider';
import {
    emitWaitingRoomAccepted,
    emitWaitingRoomDenied
} from '../../modules/ShellyEvents';
import * as WaitingRoomModule from '../../modules/WaitingRoom';
import type {WaitingRoom} from '../../validations/params';
import Component from './Component';

interface Config {
    enable: boolean;
}

export default class WaitingRoomComponent extends Component<Config> {
    constructor() {
        super('waitingroom');
    }

    @Component.Expose('GetPending')
    async getPending() {
        return await WaitingRoomModule.listPendingDevices();
    }

    @Component.Expose('GetDenied')
    async getDenied() {
        return await WaitingRoomModule.getDenied();
    }

    @Component.Expose('AcceptPendingById')
    async acceptPendingById({ids}: WaitingRoom.AcceptPendingById) {
        const success: number[] = [];
        const error: number[] = [];

        for (const idNum of ids) {
            try {
                await WaitingRoomModule.approveDevice(idNum);
                success.push(idNum);
                emitWaitingRoomAccepted(idNum);
            } catch (err) {
                this.logger.warn('Failed to approve internal ID', idNum, err);
                error.push(idNum);
            }
        }

        return {success, error};
    }

    @Component.Expose('AcceptPendingByExternalId')
    async acceptPendingByExternal({
        externalIds
    }: WaitingRoom.AcceptPendingByExternalId) {
        const success: string[] = [];
        const error: string[] = [];

        for (const externalId of externalIds) {
            try {
                const rec = await accessControl(externalId);
                if (!rec || typeof rec.id !== 'number') {
                    throw new Error(
                        `Unknown device external_id='${externalId}'`
                    );
                }
                await WaitingRoomModule.approveDevice(rec.id);
                success.push(externalId);
                emitWaitingRoomAccepted(rec.id);
            } catch (err) {
                this.logger.warn(
                    'Failed to approve external ID',
                    externalId,
                    err
                );
                error.push(externalId);
            }
        }

        return {success, error};
    }

    @Component.Expose('RejectPending')
    async rejectPending({shellyIDs}: {shellyIDs: string[]}) {
        const success: string[] = [];
        const error: string[] = [];
        for (const shellyID of shellyIDs) {
            try {
                await WaitingRoomModule.denyDevice(Number(shellyID));
                success.push(shellyID);
                emitWaitingRoomDenied(Number(shellyID));
            } catch (err) {
                this.logger.warn('Failed to deny', shellyID, err);
                error.push(shellyID);
            }
        }

        return {
            success,
            error
        };
    }

    protected override getDefaultConfig(): Config {
        return {
            enable: true
        };
    }
}
