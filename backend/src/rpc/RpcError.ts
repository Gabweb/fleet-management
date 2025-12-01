import {DEV_MODE} from '../config';
import type {JsonRpcOutgoingError} from './types';

const ERROR_CODES = {
    DEVICE_NOT_FOUND_ERROR: -32900,
    TIMEOUT_ERROR: -32800,
    PARSE_ERROR: -32700,
    INVALID_REQUEST: -32600,
    METHOD_NOT_FOUND: -32601,
    INVALID_PARAMS: -32602,
    SERVER_ERROR: -32001,
    // Custom errors
    UNAUTHORIZED: -32603
};

export default class RpcError extends Error {
    private constructor(
        private readonly errorCode: number,
        private readonly errorMessage: string
    ) {
        super(errorMessage);

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, RpcError);
        }
    }

    getErrorObject() {
        let trace: string[] | undefined = undefined;

        if (DEV_MODE) {
            if (this.stack) {
                trace = this.stack.split('\n');
            } else {
                trace = [
                    'Missing stack??',
                    'Someone threw a non-error object???'
                ];
            }
        }

        return {
            code: this.errorCode,
            message: this.errorMessage,
            data: trace
        };
    }

    getRpcError(id?: number, dst?: string) {
        return {
            id: id || null,
            src: 'FLEET_MANAGER',
            dst,
            error: this.getErrorObject()
        } satisfies JsonRpcOutgoingError;
    }

    static fromError(err: Error) {
        const error = new RpcError(ERROR_CODES.SERVER_ERROR, String(err));
        error.stack = err.stack;
        return error;
    }

    static Timeout() {
        return new RpcError(ERROR_CODES.TIMEOUT_ERROR, 'Timeout');
    }

    static MethodNotFound() {
        return new RpcError(ERROR_CODES.METHOD_NOT_FOUND, 'Method not found');
    }

    static DeviceNotFound() {
        return new RpcError(
            ERROR_CODES.DEVICE_NOT_FOUND_ERROR,
            'Device not found.'
        );
    }

    static Server(message: string) {
        return new RpcError(ERROR_CODES.SERVER_ERROR, message);
    }

    static InvalidRequest(message?: string) {
        return new RpcError(
            ERROR_CODES.INVALID_REQUEST,
            message ?? 'Invalid request'
        );
    }

    static InvalidParams(message?: string) {
        return new RpcError(
            ERROR_CODES.INVALID_PARAMS,
            message ?? 'Invalid Params'
        );
    }

    static Unauthrozied() {
        return new RpcError(ERROR_CODES.UNAUTHORIZED, 'Unauthorized');
    }
}
