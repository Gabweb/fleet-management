/**
 * Shelly Connect Listener Plugin
 * -----------------------------------------------------------------------------
 * This plugin demonstrates how to:
 *  - capture the Fleet Manager `call` function at load time and reuse it
 *    throughout the plugin (via `__callRef`);
 *  - register a lightweight component with a `ping` method;
 *  - listen for WaitingRoom acceptance/denial events and react to them;
 *  - resolve internal numeric IDs to external Shelly IDs via Postgres;
 *  - send device RPC commands with exponential backoff/retry.
 *
 * PLUGIN RUNTIME MODEL
 * -----------------------------------------------------------------------------
 * • Plugins run in a worker thread and can:
 *   - register components (exposed over JSON-RPC at /rpc/<component.method>);
 *   - make calls to other registered components using a dependency-injected `call`.
 * • The plugin entrypoint may export lifecycle hooks:
 *   - `load({ call, defineComponent })`   – invoked on plugin load
 *   - `unload()`                          – invoked on plugin unload
 *   - `on(event, eventData?)`             – invoked for each JSON-RPC notification
 *
 * WHY KEEP A GLOBAL CALL REF?
 * -----------------------------------------------------------------------------
 * The `call` function is dependency-injected into `load()`. If we
 * only used it inside `load()`’s closure, we couldn’t access it from:
 *   - top-level helpers (e.g., resolveShellyIDByInternalId, sendViaFleetManager)
 *   - event handlers (the exported `on()` function)
 *   - timers/retries that fire *after* `load()` has returned
 *
 * To make `call` accessible “from everywhere” in this plugin file, we store it
 * in a module-scoped variable `__callRef`. All helpers read from `__callRef`
 * safely (guarding for undefined); `load()` initializes it, and `unload()`
 * clears it.
 */

type tCall = (method: string, params?: any) => Promise<any>;
type tComponent = {
  name: string;
  methods: Map<string, (params: any, sender: any) => Promise<any>>;
};
type tDefineComponent = (component: tComponent) => void;

type JsonRpcEvent = { method: string; params?: any };
type EventData = { device?: any; reason?: string };

interface LoadCtx {
  call?: tCall; // injected call() – used to call any FM component
  defineComponent: tDefineComponent; // registers an exposed component
}

type Command = {
  dst: string[]; // destination Shelly IDs
  method: string; // RPC method (e.g. "Switch.Toggle", "Shelly.GetStatus")
  params?: Record<string, any>; // RPC params
};

/** Global reference to the injected `call` function (see big note above). */
let __callRef: tCall | undefined;

/**
 * Example command list.
 * When a device leaves the Waiting Room (Accepted), we will dispatch any
 * matching commands to that device with exponential backoff.
 */
let commandList: Command[] = [
  {
    dst: ["shellyproem50-ece334ea0e5c"],
    method: "Switch.Toggle",
    params: { id: 0 },
  },
  {
    dst: ["shellyproem50-ece334ea0e5c"],
    method: "Shelly.GetStatus",
    params: {},
  },
];

/**
 * Resolve a numeric internal device ID to its external Shelly ID
 * by calling the Postgres provider through Fleet Manager.
 *
 * Uses: FleetManager.PostgresProviderCallMethod -> device.fn_fetch
 */
async function resolveShellyIDByInternalId(
  internalId: number
): Promise<string | undefined> {
  if (!__callRef) return undefined;
  try {
    const r = await __callRef("FleetManager.PostgresProviderCallMethod", {
      name: "device.fn_fetch",
      args: {
        p_external_id: null,
        p_id: internalId,
        p_control_access: null,
      },
    });
    const rows = r?.rows || [];
    return rows[0]?.external_id as string | undefined;
  } catch (err) {
    console.warn("[shelly-connect-listener] device.fn_fetch failed", {
      internalId,
      err: String(err),
    });
    return undefined;
  }
}

/**
 * Thin wrapper to send a device RPC via Fleet Manager’s RPC proxy.
 *
 * Uses: FleetManager.SendRPC (which returns a per-device result map)
 */
async function sendViaFleetManager(dst: string, method: string, params: any) {
  if (!__callRef) {
    return { code: -32603, message: "Core call() not available" };
  }
  try {
    return await __callRef("FleetManager.SendRPC", { dst, method, params });
  } catch (err: any) {
    return { code: -32603, message: String(err) };
  }
}

/**
 * Extract the per-device payload from FleetManager.SendRPC response and detect errors.
 */
function isErrorResult(
  raw: any,
  shellyID: string
): { error: any | null; payload: any } {
  const payload = raw?.[shellyID] ?? raw;
  if (
    payload &&
    typeof payload === "object" &&
    "code" in payload &&
    payload.code !== 0
  ) {
    return { error: payload, payload };
  }
  return { error: null, payload };
}

/**
 * Exponential backoff dispatcher:
 *  - First delay: 15s, then doubles each retry (30s, 60s, ...)
 *  - Retries up to `maxAttempts` times
 *  - Logs success/failure
 */
function dispatchCommandWithRetry(
  shellyID: string,
  cmd: Command,
  attempt = 1,
  delayMs = 15_000,
  maxAttempts = 10
): void {
  (async () => {
    console.log("[shelly-connect-listener] Sending command", {
      shellyID,
      method: cmd.method,
      attempt,
    });

    const raw = await sendViaFleetManager(
      shellyID,
      cmd.method,
      cmd.params ?? {}
    );
    const { error, payload } = isErrorResult(raw, shellyID);

    if (!error) {
      console.log("[shelly-connect-listener] Command succeeded", {
        shellyID,
        method: cmd.method,
        result: payload,
      });
      return;
    }

    console.warn("[shelly-connect-listener] Command failed", {
      shellyID,
      method: cmd.method,
      attempt,
      error,
    });

    if (attempt >= maxAttempts) {
      console.error("[shelly-connect-listener] Command failed permanently", {
        shellyID,
        method: cmd.method,
        attempts: attempt,
      });
      return;
    }

    const nextDelay = delayMs * 2;
    console.log("[shelly-connect-listener] Retrying later", {
      shellyID,
      method: cmd.method,
      nextDelayMs: delayMs,
      nextAttempt: attempt + 1,
    });

    setTimeout(() => {
      dispatchCommandWithRetry(
        shellyID,
        cmd,
        attempt + 1,
        nextDelay,
        maxAttempts
      );
    }, delayMs);
  })().catch((e) => {
    if (attempt >= 10) {
      console.error("[shelly-connect-listener] Fatal send error, giving up", {
        shellyID,
        method: cmd.method,
        err: String(e),
      });
      return;
    }
    const nextDelay = delayMs * 2;
    setTimeout(() => {
      dispatchCommandWithRetry(shellyID, cmd, attempt + 1, nextDelay, 10);
    }, delayMs);
  });
}

/* -------------------------------------------------------------------------- */
/* Lifecycle: load / on / unload                                              */
/* -------------------------------------------------------------------------- */

/**
 * load()
 *  - Captures the injected `call` into `__callRef` so helpers and event
 *    handlers can use it later (outside this function’s closure).
 *  - Registers a tiny component `shelly-connect-listener.ping` for health checks.
 *
 * From the docs:
 *   function load({ call, defineComponent }: { call: tCall, defineComponent: tDefineComponent })
 *   is called once on plugin startup.
 */
export async function load({ defineComponent, call }: LoadCtx): Promise<void> {
  __callRef = call; // <-- Make `call` globally accessible across the plugin (see big note above)

  const methods = new Map<string, (params: any) => Promise<any>>();

  // Health check method: greetings/ping-like endpoint
  methods.set("ping", async () => ({
    ok: true,
    plugin: "shelly-connect-listener",
  }));

  // Register the component; exposed RPC name: "shelly-connect-listener.ping"
  defineComponent({
    name: "shelly-connect-listener",
    methods,
  });

  console.log("[shelly-connect-listener] Plugin loaded");
}

/**
 * on(event)
 *  - Listens to JSON-RPC notifications.
 *  - Specifically reacts to WaitingRoom acceptance/denial events:
 *      • Accepted: resolve ShellyID (if necessary) and dispatch queued commands with retries
 *      • Denied:   log event (example)
 *
 * From the docs:
 *   export function on(rpcEvent, eventData?) { ... }
 */
export async function on(
  event: JsonRpcEvent,
  _eventData?: EventData
): Promise<void> {
  if (!event || typeof event.method !== "string") return;

  switch (event.method) {
    case "WaitingRoomEvent.Accepted": {
      const raw =
        event.params?.id ?? event.params?.shellyID ?? event.params?.externalId;

      let shellyID: string | undefined;
      // Accepts either an internal numeric id or a direct ShellyID string
      if (
        typeof raw === "number" ||
        (typeof raw === "string" && /^\d+$/.test(raw))
      ) {
        const internalId = Number(raw);
        shellyID = await resolveShellyIDByInternalId(internalId);
      } else if (typeof raw === "string") {
        shellyID = raw;
      }

      if (!shellyID) {
        console.warn(
          "[shelly-connect-listener] Could not resolve shellyID for WaitingRoomEvent.Accepted",
          { raw }
        );
        break;
      }

      // Select commands whose destination includes this ShellyID
      const matches = commandList.filter(
        (c) => Array.isArray(c.dst) && c.dst.includes(shellyID!)
      );
      if (!matches.length) {
        console.log("[shelly-connect-listener] No matching commands for", {
          shellyID,
        });
        break;
      }

      console.log("[shelly-connect-listener] Dispatching commands", {
        shellyID,
        count: matches.length,
      });

      for (const cmd of matches) {
        dispatchCommandWithRetry(shellyID, cmd, 1, 15_000, 10);
      }
      break;
    }

    case "WaitingRoomEvent.Denied": {
      const id =
        event.params?.id ?? event.params?.shellyID ?? event.params?.externalId;
      console.log("[shelly-connect-listener] Waiting room DENIED:", { id });
      break;
    }

    default:
      // ignore other events
      break;
  }
}

/**
 * unload()
 *  - Clears state (command list, `__callRef`) and logs unload.
 *
 * From the docs:
 *   export function unload() { ... }
 */
export function unload(): void {
  commandList = [];
  __callRef = undefined; // ensure we don’t accidentally use a stale `call`
  console.log("[shelly-connect-listener] Plugin unloaded");
}
