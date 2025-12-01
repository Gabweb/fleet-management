import {readdir, stat} from 'node:fs/promises';
import Ajv from 'ajv';
const ajv = new Ajv();
import path from 'node:path';

const VALIDATION_SRC = path.join(__dirname, '../validations');

export async function init() {
    const dir = await readdir(VALIDATION_SRC);
    for (const entry of dir) {
        const path = `${VALIDATION_SRC}/${entry}`;
        let schemas: any;
        if ((await stat(path)).isDirectory()) {
            schemas = {};
            for (const pathEntry of await readdir(path)) {
                const name = pathEntry.split('.', 1)[0];
                schemas[name] = require(`${path}/${pathEntry}`);
            }
        } else {
            schemas = require(path);
        }

        Object.keys(schemas).map((ns: string) =>
            Object.keys(schemas[ns]).map((m) =>
                ajv.addSchema(
                    {...schemas[ns][m], title: `${ns}.${m}`},
                    `${ns}.${m}`.toLowerCase()
                )
            )
        );
    }
}

export function validator(method: string) {
    return ajv.getSchema(method);
}
