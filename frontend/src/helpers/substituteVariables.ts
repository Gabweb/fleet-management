import { getRegistry } from '@/tools/websocket'

const registry = getRegistry('action-variables')

export async function substituteVariables(obj: any): Promise<any> {
    let vars: Record<string, string> = {}
    try {
        vars = (await registry.getAll<Record<string, string>>()) ?? {}
    } catch {
        vars = {}
    }

    if (typeof obj === 'string') {
        return obj.replace(/\$\{([A-Za-z0-9_]+)\}/g, (_, key) =>
            vars[key] != null ? vars[key] : `\${${key}}`
        )
    }

    if (Array.isArray(obj)) {
        const arr = await Promise.all(obj.map(substituteVariables))
        return arr
    }

    if (obj && typeof obj === 'object') {
        const out: Record<string, any> = {}
        for (const k in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, k)) {
                out[k] = await substituteVariables(obj[k])
            }
        }
        return out
    }

    return obj
}
