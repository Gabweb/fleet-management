import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import * as log4js from "log4js";
import type { ZitadelIntrospectionOptions } from "passport-zitadel";
import rc from "rc";
import websocketAppender from "./../websocketAppender";
const logger = log4js.getLogger("config");

export const CFG_FOLDER =
  process.env?.CONFIG_FOLDER || path.join(__dirname, "../../cfg");
export const STATIC_FOLDER =
  process.env?.STATIC_FOLDER || path.join(__dirname, "../../static");
export const PLUGINS_FOLDER =
  process.env?.PLUGINS_FOLDER || path.join(__dirname, "../../plugins");

export interface config_rc_t {
  oidc?: {
    backend: ZitadelIntrospectionOptions;
    frontend: any;
  };
  graphs?: {
    grafana: { endpoint: string };
  };
  components: {
    group?: Record<string, object>;
    mail?: Record<string, object>;
    mdns?: Record<string, object>;
    storage?: Record<string, object>;
    user?: Record<string, object>;
    web?: {
      relativeClientPath: string;
      port: number;
      port_ssl: number;
      https_crt: string;
      https_key: string;
      jwt_token: string;
    };
  };
  internalStorage?: {
    connection: {
      host: string;
      port?: number;
      user: string;
      max?: number;
      password: string;
      database: string;
      connectionTimeoutMillis?: number;
      idleTimeoutMillis?: number;
      allowExitOnIdle?: boolean;
    };
    schema: string;
    cwd: string[];
    link: any;
  };
  "wipe-components": boolean;
  "wipe-node-red": boolean;
  "dev-mode": boolean;
  "root-user"?: {
    username: string;
    password: string;
  };
  logger: log4js.Configuration;
}

export const configRc: config_rc_t = rc<config_rc_t>("fleet-manager", {
  "wipe-components": false,
  "wipe-node-red": false,
  "dev-mode": false,
  logger: {
    appenders: {
      console: { type: "console" },
      websocket: { type: websocketAppender } as any,
    },
    categories: {
      default: {
        appenders: ["console", "websocket"],
        level: "all",
      },
    },
  },
  internalStorage: {
    connection: {
      host: "localhost",
      // port: 5434, // for my dev env
      user: "fleet",
      max: 40,
      password: "fleet",
      database: "fleet",
      connectionTimeoutMillis: 7000,
      idleTimeoutMillis: 15000,
      allowExitOnIdle: true,
    },
    schema: "migration",
    cwd: [
      "./db/migration/postgresql/logging",
      "./db/migration/postgresql/organization",
      "./db/migration/postgresql/user",
      "./db/migration/postgresql/ui",
      "./db/migration/postgresql/device",
      "./db/migration/postgresql/device/groups",
      "./db/migration/postgresql/device/em",
      "./db/migration/postgresql/notifications",
    ],
    link: {
      schemas: [
        "device",
        "user",
        "ui",
        "organization",
        "device_em",
        "logging",
        "notifications",
      ],
    },
  },
  components: {
    web: {
      port: 7011,
      port_ssl: -1,
      https_crt: "/path/to/cert.crt",
      https_key: "/path/to/cert.key",
      jwt_token: "secret-token-dsadas73e7",
      relativeClientPath: "../../../../frontend/dist",
    },
  },
});

logger.info("RC Config", JSON.stringify(configRc, null, 4));

// Make sure all folders are present
const REQUIRED_FOLDERS = ["node-red", "components", "registry", "grafana"];
export async function bootstrapFs() {
  return Promise.all(
    REQUIRED_FOLDERS.map(async (f) => {
      try {
        const folderPath = path.join(__dirname, "../../cfg", f);
        if (!fs.existsSync(folderPath)) await fsPromises.mkdir(folderPath);
      } catch (e) {
        logger.error(e);
      }
    })
  );
}

// wipe flag has been set
if (configRc["wipe-components"]) {
  logger.warn("Wipe components flag set to TRUE, resetting everything");

  let count = 0;
  for (const file of fs.readdirSync(path.join(CFG_FOLDER, "components"))) {
    if (file.startsWith(".")) continue;
    fs.rmSync(path.join(CFG_FOLDER, "components", file));
    count++;
  }

  logger.warn("DELETED %s configs ", count);
}

export const loginStrategy = getLoginStrategy();
logger.info("LOGIN_STRATEGY:[%s]", loginStrategy);

export const DEV_MODE = !!configRc["dev-mode"];
logger.warn("Starting in DEV_MODE ", DEV_MODE);
if (DEV_MODE) {
  logger.warn("Starting in DEV_MODE 1");
  console.table({
    CFG_FOLDER,
    STATIC_FOLDER,
    PLUGINS_FOLDER,
  });
}

function getLoginStrategy() {
  if (configRc?.oidc?.backend) {
    return "zitadel-introspection";
  }

  return "backend-jwt";
}
