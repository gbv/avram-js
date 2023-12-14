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

  validateWithJSONSchema(schema) {
    return this.validator(schema) ? [] : this.validator.errors
  }

  validate(schema) {
    const errors = this.validator ? this.validateWithJSONSchema(schema) : []

    errors.push(...this.validateFieldSchedule(schema.fields))

    for (let codelist of Object.values(schema.codelists || {})) {
      errors.push(...this.validateCodes(codelist.codes || {}))
    }
    
    return errors
  }

  validateFieldSchedule(fields) {
    const errors = []
    for (let id in fields) {
      const field = fields[id]
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
      for (let ind of ["indicator1","indicator2"]) {
        if (ind in field && typeof field[ind].codes == "object") {
          errors.push(...this.validateCodes(field[ind].codes || {}))
        }
      }
      if (field.subfields) {
        for (let key of ["positions", "pattern", "codes"]) {
          if (key in field) {
            errors.push({ message: `variable field must not have ${key}` })
          }
        }
        errors.push(...this.validateSubfieldSchedule(field.subfields))
      } else {
        errors.push(
          ...this.validateCodes(field.codes || {}),
          ...this.validatePositions(field.positions || {}),
          ...this.validatePattern(field.pattern),
        )
      }
    }
    return errors
  }

  validateSubfieldSchedule(subfields) {
    const errors = []
    for (let code in subfields) {
      const sf = subfields[code]
      if ("code" in sf && sf.code !== code) {
        errors.push({ message: `subfield code '${sf.code}' must be '${code}'` })
      }
      errors.push(
        ...this.validateCodes(sf.codes || {}),
        ...this.validatePositions(sf.positions || {}),
        ...this.validatePattern(sf.pattern),
      )
    }
    return errors
  }

  validateCodes(codes) {
    return Object.entries(codes)
      .filter(([key, code]) => "code" in code && code.code !== key)
      .map(([key, code]) => ({ message: `code '${code.code}' must be '${key}' in codelist` }))
  }

  validatePositions(positions) {
    const errors = []
    for (let pos in positions) {
      const [start, end] = pos.split("-")
      // TODO: check for overlap
      const p = positions[pos]
      if ("start" in p && p.start != start) {
        errors.push({ message: `position start '${p.start}' must be '${start}'` })
      }
      if (end === undefined) {
        if ("end" in p) {
          errors.push({ message: `position should not have end '${p.end}'` })
        }
      } else if ("end" in p && p.end != end) {
        errors.push({ message: `position end '${p.end}' must be '${end}'` })
      }
    }
    return errors
  }

  validatePattern(pattern) {
    if (pattern != null) {
      try { new RegExp(pattern) } catch (e) { 
        return [{ message: `invalid pattern '${pattern}'` }]
      }
    }
    return []
  }
}
