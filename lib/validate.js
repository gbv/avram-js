import { FieldSchedule } from "./model.js"

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
    options = { ...Validator.options, ...this.options, ...options, codelists }

    const errors = []

    // TODO: externalRule (requires mechanism to load rule code)

    const fieldCount = new Counter()
    const subfieldCount = new Counter()

    for (let record of records) {
      const fieldVisitor = new Visitor(schedule) // TODO: remove (covered by fieldCount)

      fieldCount.beforeRecord()
      subfieldCount.beforeRecord()

      for (let field of record) {
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
            errors.push(
              ...validateFieldContent(field, definition, options),
              ...validateIndicators(field, definition, options),
            )
            if (!fieldVisitor.visit(id) && options.nonrepeatableField) {
              const message = `Field '${id}' must not be repeated.`
              errors.push({ message, identifier: id, error: "nonrepeatableField" })
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
          message: `Missing field '${id}'.`,
          identifier: id,
          error: "missingField",
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

Validator.options = {
  invalidRecord: true,
  undefinedField: true,
  nonrepeatableField: true,
  missingField: true,
  invalidIndicator: true,
  invalidFieldValue: true,
  invalidSubfield: true,
  undefinedSubfield: true,
  nonrepeatableSubfield: true,
  missingSubfield: true,
  invalidSubfieldValue: true,
  patternMismatch: true,
  invalidPosition: true,
  undefinedCode: true,
  undefinedCodelist: false,
  countRecord: false,
  countField: false, 
  countSubfield: false,
//  externalRule: false,
}

const validateFieldContent = (field, definition, options) => {
  if (Array.isArray(field.subfields)) {    // variable field
    return validateSubfields(field.subfields, definition.subfields, options)
  } else if (options.invalidFieldValue) {  // fixed field
    return validateValue(field.value, definition, options)
  } else {
    return []
  }
}

const validateIndicators = (field, definition, options) => {
  if (!options.invalidIndicator) return []
  const errors = []
  for (let ind of ["indicator1", "indicator2"]) {
    if (ind in field !== ind in definition) {
      errors.push({      
        message: `Existence mismatch of ${ind}.`,
        error: "invalidIndicator",
      })
    } else if (ind in field) {
      const codes = definition[ind] ?? { " ": {} }
      errors.push(...validateCode(field[ind], { codes }, options, true))
    }
  }
  return errors
}

// See <https://format.gbv.de/schema/avram/specification#subfield-validation>
export const validateSubfields = (subfields, schedule, options) => {
  if (!options.invalidSubfield) return []

  const errors = []
  const visitor = new Visitor(schedule)

  for (let i=0; i<subfields.length; i+=2) {
    const code = subfields[i]
    const subfieldDefinition = schedule[code]

    if (code in schedule) {
      if (!visitor.visit(code) && options.nonrepeatableSubfield) {
        errors.push({
          message: `Subfield '${code}' must not be repeated.`,
          error: "nonrepeatableSubfield",
          code,
        })
      }
      if (options.invalidSubfieldValue) {
        const value = subfields[i+1]
        errors.push(...validateValue(value, subfieldDefinition, options))
      }
    } else if(options.undefinedSubfield) {
      errors.push({
        message: `Unknown subfield '${code}'.`,
        code,
        error: "undefinedSubfield",
      })
    }
  }

  if (options.missingSubfield) {
    errors.push(...visitor.missing().map(code => ({
      message: `Missing subfield '${code}'.`, code, error: "missingSubfield",
    })))
  }

  return errors
}

// See https://format.gbv.de/schema/avram/specification#value-validation
export const validateValue = (value, definition, options = {}) => {
  const { pattern, positions } = definition
  return [
    ...(options.patternMismatch ? validatePattern(value, pattern) : []),
    ...validatePositions(value, positions, options),
    ...validateCode(value, definition, options),
  ]
}

export const validatePattern = (value, pattern) => {
  if (pattern) {
    const regexp = new RegExp(pattern, "u")
    if (!regexp.test(value)) {
      return [{
        message: `Value '${value}' does not match regex pattern '${pattern}'.`,
        error: "patternMismatch",
        value, pattern,
      }]
    }
  }
  return []
}

// See https://format.gbv.de/schema/avram/specification#validation-with-codelist
export const validateCode = (value, definition, options = {}, isIndicator = false) => {
  const { undefinedCode, undefinedCodelist, codelists } = options

  var { codes } = definition
  if (!codes || (!undefinedCode && !isIndicator)) return []

  // expand referenced codelist
  if (typeof codes === "string") {
    if (codelists && codes in codelists) {
      codes = codelists[codes]?.codes || {}
    } else {
      return undefinedCodelist ? [] :
        [{ 
          message: `Unknown codelist '${codes}'.`,
          value: codes,
          error: "undefinedCodelist",
        }]
    }
  }
    
  // value found as code
  if (value in codes) return []

  const error = isIndicator ? {
    message: `Indicator '${value}' is not defined.`,
    value,
    error: "invalidIndicator",
  } : {
    message: `Value '${value}' is not defined in codelist.`,
    value,
    error: "undefinedCode",
  }

  return [ { ...error, value } ]
}

// See https://format.gbv.de/schema/avram/specification#validation-with-positions
export const validatePositions = (value, positions, options = {})  => {    
  if (!positions || !options.invalidPosition) return []
    
  const chars = Buffer.from(value, "utf-8")

  const errors = Object.entries(positions)
    .map(([range, definition]) => {
      if (definition.pattern || definition.codes) {
        const [start, end] = range.split("-").map(n => 1*n)

        // TODO: document replacement characters if range is within a unicode character

        if (start >= chars.length || end >= chars.length) {
          return {
            message: `Position ${range} does not exist`,
            error: "invalidPosition",
            value,
          }
        }

        const slice = end 
          // utf-8 indexed by byte position
          ? chars.slice(start, end+1).toString()
          // one byte as unicode codepoint
          : String.fromCodePoint(chars[start])

        return validateValue(slice, definition, options)
      }
    })
    .filter(Boolean)

  // flatten array of arrays
  return errors.reduce((a,cur) => a.concat(cur), [])
}
