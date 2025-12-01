import * as path from "node:path";
import * as fs from "node:fs";
import pg from 'pg'
const { Pool } = pg;

const REPO_DIR = path.join(import.meta.dirname, '..', '..', '..');
let connection: any = undefined;

try {
    const rcContent = JSON.parse(fs.readFileSync(path.join(REPO_DIR, ".fleet-managerrc"), 'utf8'));
    const rcConnection = rcContent?.internalStorage?.connection;
    if (rcConnection) {
        connection = rcConnection;
    }
} catch (error) {
    // ignore
}

export async function connectToDatabase(passConnection?: pg.PoolConfig) {
    const finalConnection = passConnection ?? connection
    const pool = new Pool(finalConnection)

    const query = async (text: string, params?: Array<string | number | boolean>) => {
        return await pool.query(text, params)
    }

    return {
        query
    }
}