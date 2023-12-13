import { readFileSync } from "fs"

const jsonSchema = JSON.parse(readFileSync(new URL("../avram-schema.json", import.meta.url)))

// load ajv, if available
import { createRequire } from "node:module"
const require = createRequire(import.meta.url)

const { default: Ajv } = await import("ajv").catch(() => ({}))
const { default: addFormats } = await import("ajv-formats").catch(() => ({}))

export class SchemaValidator {
  constructor() {
    if (Ajv && addFormats) {
      const ajv = new Ajv({strictTypes: false})
      ajv.addMetaSchema(require("ajv/lib/refs/json-schema-draft-06.json"))
      addFormats(ajv)
      this.validator = ajv.compile(jsonSchema)
    } else {
      console.warn("ajv and/or ajv-formats is not installed so Avram schema validation is very limited!")
    }
  }

  validateViaSchema(schema) {
    return this.validator(schema) ? [] : this.validator.errors
  }

  validate(schema) {
    const errors = this.validator ? this.validateViaSchema(schema) : []

    if (typeof schema.fields === "object") {
      errors.push(...this.validateFieldSchedule(schema.fields))
    } else if (!this.validator) {
      errors.push({ message: "missing or malformed required key 'fields'" })
    }

    if (typeof schema.codelists === "object") {
      for (let codelist of Object.values(schema.codelists)) {
        if (typeof codelist === "object") {
          errors.push(...this.validateCodes(codelist.codes || {}))
        }
      }
    }
    
    return errors
  }

  validateFieldSchedule(fields) {
    const errors = []
    for (let id in fields) {
      const field = fields[id]
      if (typeof field === "object") {
        if ("tag" in field) {
          let hasId = field.tag 
            + ("occurrence" in field ? "/" + field.occurrence : "")
            + ("counter" in field ? "/$x" + field.counter : "")
          if (hasId !== id) {
            errors.push({
              message: `field identifier '${id}' does not match field definition '${hasId}'`,
            })
          }
        }
      } else if (!this.validator) {
        errors.push({ message: "field definition must be object" })
      }
    }
    // TODO: additional constraints
    return errors
  }

  validateCodes(codes) {
    return Object.entries(codes)
      .filter(([key, code]) => "code" in code && code.code !== key)
      .map(([key]) => ({ message: `code must be '${key}' in codelist` }))
  }
}
