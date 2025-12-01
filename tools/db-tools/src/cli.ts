import { Command } from 'commander';
import { consola } from "consola";
import { connectToDatabase } from "./db.js";

type Db = Awaited<ReturnType<typeof connectToDatabase>>;

const PORT = Number(process.env.PG_PORT) || 5432;

const MAIN_DB_CONFIG = {
    user: "postgres",
    password: "mysecretpassword",
    database: "postgres",
    port: PORT,
};

const program = new Command();
program
    .name("Fleet Manager DB Tools")
    .description("Create, modify and delete FM associated DBs")
    .version("0.0.1");

program
    .command("test")
    .description("test connection")
    .action(async () => {
        const db = await connectToDatabase();
        await db.query("SELECT NOW()");
        consola.success("Connection successful");
        process.exit(0);
    })

program
    .command("init")
    .description("Create database, user and password")
    .argument("<name>", "database name, user and password")
    .action(async (name) => {
        try {
            const mainDb = await connectToDatabase(MAIN_DB_CONFIG);
            await createUser(mainDb, name, name);
            consola.success("Created user/db/password " + name);
            const userDb = await connectToDatabase({...MAIN_DB_CONFIG, database: name});
            await createPermissions(userDb, name);
            consola.success("Permissions granted");
            consola.info("Paste text below info .fleet-managerrc into .internalConnection.connection")
            console.log({
                host: "localhost",
                user: name,
                port: PORT,
                max: 40,
                password: name,
                database: name
            })
        } catch (error) {
            consola.error(error)
        }
        process.exit(0);
    });

program
    .command("drop")
    .description("Drop database, keep user")
    .argument("<name>", "database name")
    .action(async (name) => {
        try {
            const userDb = await connectToDatabase(MAIN_DB_CONFIG);
            await userDb.query(`DROP DATABASE "${name}";`);
            await userDb.query(`DROP USER "${name}";`);
            consola.success("User & DB dropped");
        } catch (error) {
            consola.error(error)
        }
        process.exit(0);
    });

program.parse();

// Helpers

async function createUser(db: Db, username: string, password: string) {
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        throw new Error("Invalid username format.");
    }
    if (!/^[a-zA-Z0-9_]+$/.test(password)) {
        throw new Error("Invalid password format.");
    }
    await db.query(`CREATE USER "${username}" WITH ENCRYPTED PASSWORD '${password}';`);
    await db.query(`CREATE DATABASE "${username}" OWNER "${username}";`);
    await db.query(`GRANT ALL PRIVILEGES ON DATABASE "${username}" TO "${username}";`);
}

async function createPermissions(db: Db, user: string) {
    await db.query(`CREATE SCHEMA IF NOT EXISTS migration AUTHORIZATION "${user}";`);
    await db.query(`GRANT ALL ON SCHEMA _timescaledb_cache TO "${user}";`);
    await db.query(`GRANT ALL ON SCHEMA _timescaledb_catalog TO "${user}";`);
    await db.query(`GRANT ALL ON SCHEMA _timescaledb_config TO "${user}";`);
    await db.query(`GRANT ALL ON SCHEMA _timescaledb_debug TO "${user}";`);
    await db.query(`GRANT ALL ON SCHEMA _timescaledb_functions TO "${user}";`);
    await db.query(`GRANT ALL ON SCHEMA _timescaledb_internal TO "${user}";`);
    await db.query(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA _timescaledb_cache TO "${user}";`);
    await db.query(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA _timescaledb_catalog TO "${user}";`);
    await db.query(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA _timescaledb_config TO "${user}";`);
    await db.query(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA _timescaledb_debug TO "${user}";`);
    await db.query(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA _timescaledb_functions TO "${user}";`);
    await db.query(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA _timescaledb_internal TO "${user}";`);
}