import { readFileSync } from "fs"

const jsonSchema = JSON.parse(readFileSync(new URL("../avram-schema.json", import.meta.url)))

// load ajv, if available
const { default: Ajv } = await import("ajv").catch(() => ({}))
import { createRequire } from "node:module"
const require = createRequire(import.meta.url)

// TODO: enable/add "http://json-schema.org/draft-06/schema#"

export class SchemaValidator {
  constructor() {
    // TODO: check version of Ajv?
    if (Ajv) {
      const ajv = new Ajv()
      ajv.addMetaSchema(require("ajv/lib/refs/json-schema-draft-06.json"))
      this.validator = ajv.compile(jsonSchema)
    } else {
      console.warn("ajv is not installed so Avram schema validation is very limited!")
    }
  }

  validate() {
    const errors = []
    return errors
  }
}
