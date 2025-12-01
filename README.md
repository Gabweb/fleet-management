# Fleet Management

Fleet Manager is a standalone software service for controlling and monitoring a fleet of second generation Shelly devices. Fleet Manager exposes a websocket server endpoint on which Shelly Plus and Pro series devices can connect to using their outbound websockets. Once connected they can be fully managed by Fleet Manager. Fleet Manager also exposes a websocket endpoint for clients to connect to. Messages send to Fleet Manager must follow the [JSON-RPC 2.0 protocol](https://www.jsonrpc.org/specification). Communication protocols for Fleet Management are described in [RPC and Components](./docs/rpc_and_components.md)

## Start the program

### Using docker:

#### Requirements

- Kernel version >=5.x.x (ask: `uname -a`)
- docker version >=19.x (ask: `docker -v`)
- docker compose version >=2.x.x (ask: `docker-compose version` OR `docker compose version`)

```bash
1. Open your terminal.
2. Navigate to wherever you have cloned the Fleet Manager repository. Make sure that inside that folder there is a file named "docker-compose.yml".
3. Paste this command:

docker compose up -d

You now have an instance of the Fleet Manager running on localhost:7011. You can log in to it using {"username": "admin", "password": "admin"}
```

####

##### Note, if db needs to be created manually, usually db name, user, password are the same, query is as follows:

```sql
CREATE USER "fleet" WITH ENCRYPTED PASSWORD 'fleet';
CREATE DATABASE "fleet" OWNER "fleet";
GRANT ALL PRIVILEGES ON DATABASE "fleet" TO "fleet";
```

the switch to: `fleet` db and exec:

```sql
CREATE SCHEMA IF NOT EXISTS migration AUTHORIZATION "fleet";
GRANT ALL ON SCHEMA _timescaledb_cache TO fleet;
GRANT ALL ON SCHEMA _timescaledb_catalog TO fleet;
GRANT ALL ON SCHEMA _timescaledb_config TO fleet;
GRANT ALL ON SCHEMA _timescaledb_debug TO fleet;
GRANT ALL ON SCHEMA _timescaledb_functions TO fleet;
GRANT ALL ON SCHEMA _timescaledb_internal TO fleet;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA _timescaledb_cache TO fleet;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA _timescaledb_catalog TO fleet;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA _timescaledb_config TO fleet;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA _timescaledb_debug TO fleet;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA _timescaledb_functions TO fleet;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA _timescaledb_internal TO fleet;
```

##### Cleanup database for fresh migrations

```sql
DROP SCHEMA device CASCADE;
DROP SCHEMA "device.em" CASCADE;
DROP SCHEMA logging CASCADE;
DROP TABLE migration."migration.list";
DROP TABLE migration."migration.locks";
DROP SCHEMA organization CASCADE;
DROP SCHEMA ui CASCADE;
DROP SCHEMA "user" CASCADE;
```

### Run with the goal of development

Described in [Developing](./docs/developing.md).

### 2 external non TS modules:

#### `migration-collection` - makes migration, accepts db config and path where migration files are located

example config

```json
{
  "connection": {
    // db connection config
    "host": "localhost",
    "user": "**********",
    "max": 40,
    "password": "**********",
    "database": "fm"
  },
  "schema": "migration", // namespace name, where migration tables will be created
  "cwd": [
    // migration files paths
    "./db/migration/postgresql"
  ]
}
```

#### `expose-sql-methods` - exposes all sql functions for given database.schema.

accepts database connection info + where are functions that we need (where = namespace)
returns object with the following fingerprint:

```json
{
    "methods": {fn1, fn2 .....} // all functions found in configured namespace/s,
    "stop": fn(){} // of called, db connection will be closed
    "txBegin", "txEnd" // both are functions, it is usable if dev wants to use build in pg driver transaction helper, txBegin - starts
    // tx and returns tx id, txEnd accepts tx id and closes the transaction
}
```

example config

```json
{
  "connection": {
    // db connection config
    "host": "localhost",
    "user": "*******",
    "max": 40,
    "password": "************",
    "database": "fm"
  },
  "link": { "schemas": ["devices", "core"] } // namespaces that will be inspected for functions, all of those functions will be exposed
}
```

# Useful resources

1. [RPC and Components](./docs/rpc_and_components.md)
2. [Events](./docs/events.md)
3. [RPC Relay](./docs/rpc_relay.md)
4. [Plugins](./docs/plugins.md)
5. [Codebase](./docs/codebase.md)
6. [Developing](./docs/developing.md)
7. [API](./docs/api.md)
8. [Node-RED](./docs/node-red.md)

## Contributing

Contributing can be done with pull requests in Github
