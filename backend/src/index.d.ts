declare module 'migration-collection/lib/postgres' {
    export default function (cfg: any): Promise<void>;
}
declare module 'expose-sql-methods/lib/postgres' {
    export default function <T>(
        cfg2: any,
        o: {log: (...a: any) => void}
    ): Promise<{
        methods: T;
        txBegin: () => number;
        txEnd: (id: number, query: string) => number;
    }>;
}
