export interface JsonRpcIncomming {
    jsonrpc?: '2.0';
    id: number;
    src: string;
    dst?: string | string[];
    method: string;
    params?: undefined | any | any[];
}

export interface JsonRpcOutgoingSucess {
    jsonrpc?: '2.0';
    id: number;
    src: string;
    dst: string;
    result: any;
}

export interface JsonRpcOutgoingError {
    jsonrpc?: '2.0';
    id: number | null;
    src: string;
    dst?: string | undefined;
    error: {
        code: number;
        message: string;
        data?: NonNullable<any>;
    };
}

export interface JsonRpcOutgoingEvent {
    src: string;
    dst: string;
    method: 'NotifyEvent';
    params: {
        ts: number;
        events: {
            component: string;
            event: string;
        }[];
    };
}

export interface JsonRpcOutgoingStatus {
    src: string;
    dst: string;
    method: 'NotifyStatus';
    params: {
        ts: number;
        [component: string]: any;
    };
}

export type JsonRpcOutgoing = JsonRpcOutgoingSucess | JsonRpcOutgoingError;

export function parseIncomingJsonRpc(data: any): data is JsonRpcIncomming {
    return (
        typeof data === 'object' &&
        ((typeof data.jsonrpc === 'string' && data.jsonrpc === '2.0') ||
            typeof data.jsonrpc === 'undefined') &&
        typeof data.id === 'number' &&
        typeof data.src === 'string' &&
        typeof data.method === 'string' &&
        (typeof data.dst === 'undefined' ||
            typeof data.dst === 'string' ||
            (typeof data.dst === 'object' && Array.isArray(data.dst))) &&
        (typeof data.params === 'undefined' || typeof data.params === 'object')
    );
}
