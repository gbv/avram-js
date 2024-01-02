import { readFileSync } from "fs"

const jsonSchema = JSON.parse(readFileSync(new URL("../avram-schema.json", import.meta.url)))

// load ajv, if available
import { createRequire } from "node:module"
const require = createRequire(import.meta.url)

const { default: Ajv } = await import("ajv").catch(() => ({}))
const { default: addFormats } = await import("ajv-formats").catch(() => ({}))

const families = {
  flat: { id: /./, disallow: ["occurrence", "counter", "indicator1", "indicator2", "subfields"] },
  marc: { id: /^([0-9]{3}|LDR)$/, disallow: ["occurrence", "counter"] },
  pica: { id: /^[012][0-9][0-9][A-Z@]/, disallow: ["indicator1", "indicator2"] },
  mab: { id: /^[0-9]{3}$/, disallow: ["indicator1", "counter"] },
}

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
    const { family } = schema
    // TODO: warn on unknownFamily?

    errors.push(...this.validateFieldSchedule(schema.fields, family))

    for (let codelist of Object.values(schema.codelists || {})) {
      errors.push(...this.validateCodes(codelist.codes || {}))
    }
    
    return errors
  }

  validateFieldSchedule(fields, family) {
    const errors = []
    for (let id in fields) {
      const field = fields[id]

      // restrictions by format family
      const fam = families[family]
      if (fam) {
        if (!fam.id.test(id)) {
          errors.push( { message: `Invalid ${family.toUpperCase()} field identifier '${id}'` })
          continue
        }
        const keys = fam.disallow.filter(key => key in field)
        if (keys.length) { 
          for (let key of keys) {
            errors.push( { message: `Field '${id}' must not have key '${key}'` })
          }
          continue
        }
      }
      if (family === "marc") {
        if (!field.subfields && ("indicator1" in field || "indicator2" in field)) {
          errors.push( { message: `Flat field '${id}' must not have indicators` } )
          continue
        }
      } else if (family === "pica" && id[4] === "/") {
        if (id[0] == "2" ? id[5] != "$" : id[5] == "$") {
          errors.push( { message: `Invalid PICA field definition '${id}'` } )
          continue
        }
      }

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
    // TODO: overlapping field identifiers
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
      .filter(([key, code]) => (typeof code === "object" && "code" in code && code.code !== key))
      .map(([key, code]) => ({ message: `code '${code.code}' must be '${key}' in codelist` }))
  }

  validatePositions(positions) {
    const errors = []
    const points = []
    for (let pos in positions) {
      const range = pos.split("-")
      const [start,end] = range.length > 1 ? range : [range[0], range[0]]
      const p = positions[pos]
      if ("start" in p && p.start != start) {
        errors.push({ message: `position start '${p.start}' must be '${start}'` })
      }
      if ("end" in p && p.end != end) {
        errors.push({ message: `position end '${p.end}' must be '${end}'` })
      }
      points.push([start,"start",pos])
      points.push([end,"end",pos])
    }

    // find the first overlap
    points.sort((a,b) => a[0]-b[0])
    let inRange = false
    let curPos = null
    for (let [pos,type,range] of points) {
      if (type == "start") {
        if (inRange !== false) {
          errors.push({message: `position '${range}' overlaps with position ${inRange}`})
          break
        } else if (curPos == pos) {
          errors.push({message:`position '${range}' overlaps at ${pos}`})
          break
        }
        inRange = range
      } else {
        curPos = pos
        inRange = false
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
