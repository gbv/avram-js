import { FieldSchedule } from "./model.js"
import { optionDefault } from "./options.js"

class Visitor {
  constructor(schedule) {
    this.schedule = schedule
    this.seen = {}
  }
  visit(id) {
    if (this.seen[id]) {
      if (!this.schedule[id].repeatable) {
        return false
      }
      this.seen[id]++
    } else {
      this.seen[id] = 1
    }
    return true
  }
  missing() {
    const { schedule, seen } = this 
    return Object.keys(schedule).filter(id => schedule[id].required && !seen[id])
  }
}

class Counter {
  constructor() {
    this.numbers = {}
  }
  beforeRecord() {
    this.inRecord = {}
  }
  visit(id) {
    if (id in this.numbers) {
      this.numbers[id].total++
      if (!this.inRecord[id]) {
        this.inRecord[id] = true
        this.numbers[id].records++
      }
    } else {
      this.numbers[id] = { total: 1, records: 1 }
      this.inRecord[id] = true
    }
  }
  inCurrentRecord(id) {
    return this.numbers[id]?.inRecord
  }
  check(id, expect, type, options) {
    const errors = []
    const { total, records } = this.numbers[id] || {}
    if (expect.total >= 0 && total != expect.total) {
      errors.push({
        error: "count" + type[0].toUpperCase() + type.substr(1),
        message: `expected ${type} '${id}' total count to be ${expect.total}, got ${total||0}`,
      })
    }
    if (options.countRecord && expect.records >= 0 && records != expect.records) {
      errors.push({
        error: "count" + type[0].toUpperCase() + type.substr(1),
        message: `expected ${type} '${id}' in ${expect.records} records, got ${records||0}`,
      })
    }
    return errors
  }
}

export class Validator {

  constructor(schema, options={}) {
    this.schedule = new FieldSchedule(schema)
    this.codelists = schema.codelists || {}
    this.family = schema.family
    this.records = schema.records
    this.checks = schema.checks
    this.options = options
  }

  validate(record, options={}) {
    return this.validateRecords([record], options)
  }

  validateRecords(records, options={}) {
    const { schedule, codelists } = this
    options = { ...optionDefault, ...this.options, ...options, codelists }

    const errors = []

    // TODO: externalRule (requires mechanism to load rule code)

    const fieldCount = new Counter()
    const subfieldCount = new Counter()

    for (let record of records) {
      const fieldVisitor = new Visitor(schedule)

      fieldCount.beforeRecord()
      subfieldCount.beforeRecord()

      const [fields, types] = Array.isArray(record) ? [record] : [record.fields, record.types]
      for (let field of fields) {
        var id = schedule.identifier(field)

        // count
        if (id in schedule) {
          fieldCount.visit(id)
          if (subfieldCount && field.subfields && schedule[id].subfields) {
            for (let i=0; i<field.subfields.length; i+=2) {
              const code = field.subfields[i]              
              if (code in schedule[id].subfields) {
                subfieldCount.visit(`${id}$${code}`)
              }
            }
          }
        }

        // validate
        if (options.invalidRecord) {
          if (id) {
            const definition = schedule[id]
            if (definition.deprecated && options.deprecatedField) {
              errors.push({
                error: "deprecatedField",
                message: `field ${id} is deprecated`,
                id,
              })
            } else {
              errors.push(
                ...validateFieldContent(field, definition, options, types, id),
                ...validateIndicators(field, definition, options, id),
              )
              if (!fieldVisitor.visit(id) && options.nonrepeatableField) {
                const message = `Field '${id}' must not be repeated.`
                errors.push({ message, identifier: id, error: "nonrepeatableField" })
              }
            }
          } else if (options.undefinedField) {
            const { tag, occurrence } = field
            const error = occurrence
              ? {message: `Unknown field '${tag}/${occurrence}'.`, tag, occurrence}
              : {message: `Unknown field '${tag}'.`, tag}
            errors.push({ ...error, error: "undefinedField" })
          }
        }
      }

      if (options.missingField && options.invalidRecord) {
        errors.push(...fieldVisitor.missing().map(id => ({
          error: "missingField",
          message: `missing ${loc({id})}`,
          id,
        })))
      }
    }

    if (options.countRecord) {
      if (this.records >= 0 && records.length != this.records) {
        errors.push({
          error: "countRecord",
          message: `expected ${this.records} records, got ${records.length}`,
        })
      }
    }

    if (options.countField || options.countSubfield) {
      for (const id in schedule) {
        const field = schedule[id]
        if (options.countField) {
          errors.push(...fieldCount.check(id, field, "field", options))
        }
        if (options.countSubfield) {
          for (const code in (field.subfields || {})) {
            const expect = field.subfields[code]
            const sfid = `${id}$${code}`
            errors.push(...subfieldCount.check(sfid, expect, "subfield", options))
          }
        }
      }
    }

    return errors
  }
}

// See https://format.gbv.de/schema/avram/specification#field-validation
const validateFieldContent = (field, definition, options, types, id) => {
  if (Array.isArray(field.subfields)) {    // variable field
    return validateSubfields(field.subfields, definition.subfields, options, id)
  } else if (options.invalidFieldValue) {  // fixed field
    return validateValue(field.value, definition, options, types, { id })
  } else {
    return []
  }
}

function loc(path) {
  if (!("id" in path)) return ""
  var s = `field ${path.id}`
  if ("indicator" in path) s += ` ${path.indicator}`
  if ("subfield" in path) s += ` subfield ${path.subfield}`
  if ("position" in path) s += ` position ${path.position}`
  return s
}

// See https://format.gbv.de/schema/avram/specification#field-validation
const validateIndicators = (field, definition, options, id) => {
  if (!options.invalidIndicator) return []
  const errors = []
  for (let indicator of ["indicator1", "indicator2"]) {
    const path = { id, indicator }
    if (indicator in field !== indicator in definition) {
      errors.push({      
        message: `Existence mismatch of ${loc(path)}.`,
        error: "invalidIndicator",
      })
    } else if (indicator in field) {
      const { codes, pattern } = definition[indicator] ?? { codes: { " ": {} } }
      if (codes) errors.push(...validateCode(field[indicator], codes, options, path))
      if (pattern) errors.push(...validatePattern(field[indicator], pattern, path))
    }
  }
  return errors
}

// See https://format.gbv.de/schema/avram/specification#field-validation
export const validateSubfields = (subfields, schedule, options, id) => {
  if (!options.invalidSubfield) return []

  const errors = []
  const visitor = new Visitor(schedule)

  for (let i=0; i<subfields.length; i+=2) {
    const code = subfields[i]
    const definition = schedule[code]
    const path = { id, subfield: code }

    if (code in schedule) {
      if (options.deprecatedSubfield && definition.deprecated) {
        errors.push({
          error: "deprecatedSubfield",
          message: `${loc(path)} is deprecated`,
          ...path,
        })
      } else { 
        if (!visitor.visit(code) && options.nonrepeatableSubfield) {
          errors.push({
            error: "nonrepeatableSubfield",
            message: `${loc(path)} must not be repeated`,
            ...path,
          })
        }
        if (options.invalidSubfieldValue) {
          const value = subfields[i+1]
          errors.push(...validateValue(value, definition, options, null, path))
        }
      }
    } else if(options.undefinedSubfield) {
      errors.push({
        error: "undefinedSubfield",
        message: `unknown ${loc(path)}`,
        ...path,
      })
    }
  }

  if (options.missingSubfield) {
    errors.push(...visitor.missing().map(subfield => ({
      error: "missingSubfield",
      message: `missing ${loc({id, subfield})}`,
      id, subfield,
    })))
  }

  return errors
}

// See https://format.gbv.de/schema/avram/specification#value-validation
export const validateValue = (value, definition, options, recordTypes, path) => {
  const valueErrors = ({pattern, positions, codes}) => [
    ...(options.patternMismatch ? validatePattern(value, pattern, path) : []),
    ...validatePositions(value, positions, options, path),
    ...validateCode(value, codes, options, path),
  ]
  const errors = valueErrors(definition)

  if (definition.types && options.recordTypes && recordTypes) {
    for (let t of recordTypes.filter(type => type in definition.types)) {
      errors.push(...valueErrors(definition.types[t]))
    }
  }

  return errors
}

// See https://format.gbv.de/schema/avram/specification#value-validation
export const validatePattern = (value, pattern, path) => {
  if (pattern) {
    const regexp = new RegExp(pattern, "u")
    if (!regexp.test(value)) {
      return [{
        error: "patternMismatch",
        message: `value '${value}' does not match regex pattern '${pattern}' in ${loc(path)}`,
        value, pattern, ...path,
      }]
    }
  }
  return []
}

// See https://format.gbv.de/schema/avram/specification#validation-with-codelist
export const validateCode = (value, codes, options = {}, path = {}) => {
  const { undefinedCode, undefinedCodelist, codelists } = options
  const isIndicator = "indicator" in path

  if (!codes || (!undefinedCode && !isIndicator)) return []

  // expand referenced codelist
  if (typeof codes === "string") {
    if (codelists && codes in codelists) {
      codes = codelists[codes]?.codes || {}
    } else {
      return undefinedCodelist ? [] :
        [{ 
          error: "undefinedCodelist",
          message: `Unknown codelist '${codes}' in ${loc(path)}.`,
          value: codes,
        }]
    }
  }
    
  // value found as code
  if (value in codes) return []

  // TODO: include field id in errors

  const error = isIndicator ? {
    error: "invalidIndicator",
    message: `value '${value}' in ${loc(path)} is not defined in codelist`,
    ...path, value,
  } : {
    error: "undefinedCode",
    message: `value '${value}' is not defined in codelist in ${loc(path)}`,
    value, ...path,
  }

  return [ { ...error, value } ]
}

// See https://format.gbv.de/schema/avram/specification#validation-with-positions
export const validatePositions = (value, positions, options = {}, path)  => {    
  if (!positions || !options.invalidPosition) return []
    
  const chars = Buffer.from(value, "utf-8")

  return Object.entries(positions)
    .map(([range, definition]) => {
      if (definition.pattern || definition.codes) {
        const [start, end] = range.split("-").map(n => 1*n)
        const posPath = { ...path, position: range }

        // TODO: document replacement characters if range is within a unicode character

        if (start >= chars.length || end >= chars.length) {
          return {
            error: "invalidPosition",
            message: `${loc(posPath)} does not exist`,
            ...posPath,
            value,
          }
        }

        const slice = end 
          // utf-8 indexed by byte position
          ? chars.slice(start, end+1).toString()
          // one byte as unicode codepoint
          : String.fromCodePoint(chars[start])

        return validateValue(slice, definition, options, null, posPath)
      }
    })
    .filter(Boolean).flat()
}
