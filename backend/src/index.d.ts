declare module 'migration-collection/lib/postgres' {
    export default function (cfg: any): Promise<void>;
}
declare module 'expose-sql-methods/lib/postgres' {
    export default function <T>(cfg2: any): Promise<{ methods: T }>;
}
