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

  constructor(schema, options={}, extensions=[]) {
    this.schedule = new FieldSchedule(schema)
    this.codelists = schema.codelists || {}
    this.family = schema.family
    this.records = schema.records
    this.checks = schema.checks
    this.extensions = extensions || []
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

      if (Array.isArray(record)) record = { fields: record }
      const { fields, types } = record

      for (let field of fields) {
        const id = schedule.identifier(field)
        const { tag, occurrence, subfields } = field

        // count
        if (id in schedule) {
          fieldCount.visit(id)
          if (subfieldCount && subfields && schedule[id].subfields) {
            for (let i=0; i<subfields.length; i+=2) {
              const code = subfields[i]              
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
                tag, id,
              })
            } else {
              errors.push(
                ...validateFieldContent(field, definition, options, types, id),
                ...validateIndicators(field, definition, options, id),
              )
              if (!fieldVisitor.visit(id) && options.nonrepeatableField) {
                const message = `Field '${id}' must not be repeated.`
                errors.push({ message, tag, id, error: "nonrepeatableField" })
              }
            }
          } else if (options.undefinedField) {
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
  const path = { id, tag: field.tag }
  if (field.occurrence) path.occurrence = field.occurrence
  if (Array.isArray(field.subfields)) {    // variable field
    return validateSubfields(field, definition.subfields, options, id)
  } else if (options.invalidFieldValue) {  // fixed field
    return validateValue(field.value, definition, options, types, path)
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
    const path = { tag: field.tag, id, indicator }
    if (indicator in field !== indicator in definition) {
      errors.push({      
        message: `Existence mismatch of ${loc(path)}`,
        error: "invalidIndicator", ...path,
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
const validateSubfields = ({ tag, subfields }, schedule, options, id) => {
  if (!options.invalidSubfield) return []

  const errors = []
  const visitor = new Visitor(schedule)

  for (let i=0; i<subfields.length; i+=2) {
    const code = subfields[i]
    const definition = schedule[code]
    const path = { id, tag, subfield: code }

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
    errors.push(...visitor.missing().map(subfield => {
      const path = { id, tag, subfield }
      return {
        error: "missingSubfield",
        message: `missing ${loc(path)}`,
        ...path,
      }
    }))
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
const validatePattern = (value, pattern, path) => {
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
const validateCode = (value, codes, options = {}, path = {}, len=null) => {
  const { undefinedCode, undefinedCodelist, codelists } = options
  const isIndicator = "indicator" in path

  if (!codes || (!undefinedCode && !isIndicator)) return []

  // expand referenced codelist
  if (typeof codes === "string") {
    if (codelists && codes in codelists) {
      codes = codelists[codes]?.codes || {}
    } else {
      return undefinedCodelist ?
        [{ 
          error: "undefinedCodelist",
          message: `Unknown codelist '${codes}' in ${loc(path)}.`,
          value: codes,
        }] : []
    }
  }
    
  if (len) {
    // flags (we already know that value is dividable by code length)
    for (let i=0; i<value.length; i+=len) {
      const flag = value.substr(i,len)
      if (!(flag in codes)) {
        return [{
          error: "invalidFlag",
          message: `value '${flag}' is not defined in flags in ${loc(path)}`,
          value: flag, ...path,
        }]
      }
    }
    return []
  } else if (value in codes) {
    // codes
    return []
  }

  const error = isIndicator ? {
    error: "invalidIndicator",
    message: `value '${value}' in ${loc(path)} is not defined in codelist`,
    ...path, value,
  } : {
    error: "undefinedCode",
    message: `value '${value}' is not defined in codelist in ${loc(path)}`,
    ...path, value,
  }

  return [ error ]
}

// See https://format.gbv.de/schema/avram/specification#validation-with-positions
export const validatePositions = (value, positions, options = {}, path)  => {    
  if (!positions || !options.invalidPosition) return []
    
  const chars = Buffer.from(value, "utf-8")

  return Object.entries(positions)
    .map(([range, definition]) => {
      const { pattern, codes, flags } = definition
      if (pattern || codes || flags) {
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

        const errors = validateValue(slice, definition, options, null, posPath)
        if (flags) {
          // FIXME: length of all flags must be the same. We cannot be sure if codelist was referenced
          const len = Object.keys(flags)[0]?.length
          if (len) {
            errors.push(...validateCode(slice, flags, options, posPath, len))
          }
        }
        return errors
      }
    })
    .filter(Boolean).flat()
}
