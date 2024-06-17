# Fleet Management

Fleet Manager is a standalone software service for controlling and monitoring a fleet of second generation Shelly devices. Fleet Manager exposes a websocket server endpoint on which Shelly Plus and Pro series devices can connect to using their outbound websockets. Once connected they can be fully managed by Fleet Manager. Fleet Manager also exposes a websocket endpoint for clients to connect to. Messages send to Fleet Manager must follow the [JSON-RPC 2.0 protocol](https://www.jsonrpc.org/specification). Communication protocols for Fleet Management are described in [RPC and Components](./docs/rpc_and_components.md)

# Useful resources
1. [RPC and Components](./docs/rpc_and_components.md)
2. [Events](./docs/events.md)
3. [RPC Relay](./docs/rpc_relay.md)
4. [Plugins](./docs/plugins.md)
5. [Codebase](./docs/codebase.md)
6. [Developing](./docs/developing.md)
## Connecting a Shelly device

To connect a second generation Shelly device do the following:
1. Open the Shelly device's local webpage
2. Navigate to Networks -> Outbound websocket
3. Click the toggle button that enables the outbound websocket and enter the address of the fleet management server followed by `/shelly` (hint: `ws://<your ip>:7011/shelly`). 

After that the device should show up in the home page of the application.


## Codebase
The codebase is split into modules - backend and frontend. They are described in the [Codebase](./docs/codebase.md) section.
## Start the program

*Keep in mind that there is a difference between codebase and docker image.*
*In docker image lives node red plugin which provides fleet manager nodes, they can be*
*used for extended control of shelly devices*
*you can pull docker image from [here](https://hub.docker.com/u/shellygroup)*

### cmd

- backend: `npm i && npx tsc -p ./tsconfig.json --watch`
- frontend: `npm i && npm run dev`
- plugins: in plugin root dir run `npm i && npx tsc --pretty --listEmittedFiles true --module commonjs --moduleResolution node --esModuleInterop true --target es2021 --lib es2021 --watch`

### Using docker:

#### Requirements

* Kernel version >=5.x.x (ask: `uname -a`)
* docker version >=19.x (ask: `docker -v`)
* docker compose version >=2.x.x (ask: `docker-compose version` OR `docker compose version`)

```bash
docker compose up -d
```

this will create 3 containers (as listed below)

- Timescale(postgres) - fleet management database
- init - this gets ran once after db container is ready (this will bootstrap databases, namespaces, db users)
- fleet-management itself
- mdns packet repeater (mdns-repeater) - this will get mdns packet from* interface and will redirect it to* interface

### Other ways
Other ways of starting the program are described in [Developing](./docs/developing.md).

### 2 external non TS modules:

#### `migration-collection` - makes migration, accepts db config and path where migration files are located

example config

```json
    {
        "connection": { // db connection config
            "host": "localhost",
            "user": "postgres",
            "max": 40,
            "password": "**********",
            "database": "em"
        },
        "schema": "migration", // namespace name, where migration tables will be created
        "cwd": [ // migration files paths
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
        "connection": { // db connection config
            "host": "localhost",
            "user": "postgres",
            "max": 40,
            "password": "mysecretpassword",
            "database": "em"
        },
        "link": {"schemas": ["devices", "core"]} // namespaces that will be inspected for functions, all of those functions will be exposed
    }
```

## OIDC (Zitadel)

## Contributing

Contributing can be done with pull requests in Github.
