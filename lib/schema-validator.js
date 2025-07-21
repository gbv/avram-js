import ajv from "./ajv.js"

import { readFileSync } from "fs"
const jsonSchema = JSON.parse(readFileSync(new URL("../avram-schema.json", import.meta.url)))

const families = {
  flat: { id: /./, disallow: ["occurrence", "counter", "indicator1", "indicator2", "subfields"] },
  marc: { id: /^([0-9]{3}|LDR)$/, disallow: ["occurrence", "counter"] },
  pica: { id: /^[012][0-9][0-9][A-Z@]/, disallow: ["indicator1", "indicator2"] },
  mab: { id: /^[0-9]{3}$/, disallow: ["indicator1", "counter"] },
}

export class SchemaValidator {
  constructor() {
    if (ajv) {
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

    try { // these may fail if JSON Schema is not met
      errors.push(...this.validateFieldSchedule(schema.fields, family))

      for (let codelist in (schema.codelists || {})) {

        const { codes } = schema.codelists[codelist]
        errors.push(...this.validateCodes(codes, { codelist } ))
      }
    
      // TODO: names of external rules MUST noch be equal to names of validation rules
    } catch(e) {
      errors.push({
        message: e.message,
        file: e.stack.split("\n")[1].replace(/.*\(file:\/\//,"").replace(/:\d+\)$/,""),
      })
    }

    return errors
  }

  validateFieldSchedule(fields, family) {
    const errors = []
    for (let id in fields) {
      const field = fields[id]
      const path = { field: id }
      const addError = message => errors.push({ message, ...path })

      // restrictions by format family
      const fam = families[family]
      if (fam) {
        if (!fam.id.test(id)) {
          addError(`Invalid ${family.toUpperCase()} field identifier '${id}'`)
          continue
        }
        const keys = fam.disallow.filter(key => key in field)
        if (keys.length) { 
          for (let key of keys) {
            addError(`Field '${id}' must not have key '${key}'`)
          }
          continue
        }
      }
      if (family === "marc") {
        if (!field.subfields && ("indicator1" in field || "indicator2" in field)) {
          addError(`Flat field '${id}' must not have indicators`)
          continue
        }
      } else if (family === "pica" && id[4] === "/") {
        if (id[0] == "2" ? id[5] != "$" : id[5] == "$") {
          addError(`Invalid PICA field definition '${id}'`)
          continue
        }
      }

      if ("tag" in field) {
        let hasId = field.tag 
          + ("occurrence" in field ? "/" + field.occurrence : "")
          + ("counter" in field ? "/$x" + field.counter : "")
        if (hasId !== id) {
          addError(`field identifier '${id}' does not match field definition '${hasId}'`)
        }
      }
      for (let ind of ["indicator1","indicator2"]) {
        if (typeof field[ind]?.codes == "object") {
          errors.push(...this.validateCodes(field[ind].codes || {}, path, 1))
        }
      }
      if (field.subfields) {
        for (let key of ["positions", "pattern", "groups", "codes"]) {
          if (key in field) {
            addError(`variable field must not have ${key}`)
          }
        }
        errors.push(...this.validateSubfieldSchedule(field.subfields, path))
      } else {
        errors.push(
          ...this.validateCodes(field.codes || {}, path),
          ...this.validatePositions(field.positions || {}, path),
          ...this.validatePattern(field.pattern, path),
        )
      }
    }
    // TODO: disallow overlapping field identifiers
    return errors
  }

  validateSubfieldSchedule(subfields, fromPath) {
    const errors = []
    const path = { ...fromPath }
    for (let code in subfields) {
      path.subfield = code
      const sf = subfields[code]
      if ("code" in sf && sf.code !== code) {
        errors.push({ message: `subfield code '${sf.code}' must be '${code}'`, ...path })
      }
      errors.push(
        ...this.validateCodes(sf.codes || {}, path),
        ...this.validatePositions(sf.positions || {}, path),
        ...this.validatePattern(sf.pattern, path),
      )
    }
    return errors
  }

  validateCodes(codes, path={}, length=0) {
    const errors = Object.entries(codes)
      .filter(([key, code]) => (typeof code === "object" && "code" in code && code.code !== key))
      .map(([key, code]) => ({
        message: `code '${code.code}' must be '${key}' in codelist`,
        code: key,
        ...path,
      }))
    if (length > 0) {
      errors.push(
        ...Object.keys(codes).filter(code => code.length !== length).map(code => ({
          message: `code '${code}' must have length ${length}`, code, ...path,
        })))
    }
    return errors
  }

  validatePositions(positions, path) {
    const errors = []
    const points = []
    for (let pos in positions) {
      const posPath = { position: pos, ...path }
      const range = pos.split("-")
      const [start,end] = (range.length > 1 ? range : [range[0], range[0]]).map(n => 1*n)
      const p = positions[pos]
      if ("start" in p && p.start != start) {
        errors.push({ message: `position start '${p.start}' must be '${start}'`, ...posPath })
      }
      if ("end" in p && p.end != end) {
        errors.push({ message: `position end '${p.end}' must be '${end}'`, ...posPath })
      }
      points.push([start,"start",pos])
      points.push([end,"end",pos])

      if (start > end) {
        errors.push({ message: `invalid position ${pos}`, ...posPath })
      } else {
        const len = end-start+1
        const { codes, flags } = p
        if (typeof codes === "object") {
          errors.push(...this.validateCodes(codes, posPath, len))
        }
        if (typeof flags === "object") {
          errors.push(...this.validateCodes(flags, posPath))
          errors.push(...
          Object.keys(flags).filter(code => (len % code.length))
            .map(code => ({ 
              message: `flag '${code}' does not fit in position ${pos}`,
              code, ...posPath,
            })),
          )
        }
      }
    }

    // find the first overlap
    points.sort((a,b) => a[0]-b[0])
    let inRange = false
    let curPos = null
    for (let [pos,type,range] of points) {
      if (type == "start") {
        if (inRange !== false) {
          errors.push({message: `position '${range}' overlaps with position ${inRange}`, position: range, ...path})
          break
        } else if (curPos == pos) {
          errors.push({message:`position '${range}' overlaps at ${pos}`, position: range, ...path})
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

  validatePattern(pattern, path) {
    if (pattern != null) {
      try {
        new RegExp(pattern) 
      } catch (e) { 
        return [{ message: `invalid pattern '${pattern}'`, ...path }]
      }
    }
    return []
  }
}
