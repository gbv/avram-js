import { FieldSchedule, ScheduleVisitor } from "./model.js"

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
    const recordsPerField = options.countRecord && options.countField
      ? new ScheduleVisitor(schedule) : null

    // TODO: countSubfield, countCode, externalRule

    for (let record of records) {
      const fieldVisitor = new ScheduleVisitor(schedule)

      for (let field of record) {
        var id = schedule.identifier(field)
        if (id) {
          const definition = schedule[id]
          errors.push(
            ...validateFieldContent(field, definition, options),
            ...validateIndicators(field, definition, options),
          )
          if (recordsPerField && !fieldVisitor.seen[id]) {
            recordsPerField.visit(id)
          }
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

      if (options.missingField) {
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
      if (options.countField) {
        for (let id in recordsPerField.seen) {
          const expect = schedule[id].records
          const got = recordsPerField.seen[id]
          if (expect >= 0 && got !== expect) {
            errors.push({
              error: "countField",
              message: `expected field '${id}' in ${expect} records, got ${got}`,
            })
          }
        }
      }
    }

    return errors
  }
}

Validator.options = {
  undefinedField: true,
  nonrepeatableField: true,
  missingField: true,
  invalidIndicator: true,
  invalidSubfield: true,
  undefinedSubfield: true,
  nonrepeatableSubfield: true,
  missingSubfield: true,
  invalidFieldValue: true,
  invalidSubfieldValue: true,
  patternMismatch: true,
  invalidPosition: true,
  undefinedCode: true,
  undefinedCodelist: false,
  countRecord: false,
  countField: false, 
// TODO:
//  countSubfield: false,
//  countCode: false, 
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
    const value = ind in field ? field[ind] : " "
    const codes = definition[ind] == null ? { " ": {} } : definition[ind]
    errors.push(...validateCode(value, { codes }, options, true))
  }
  return errors
}

// See <https://format.gbv.de/schema/avram/specification#subfield-validation>
export const validateSubfields = (subfields, schedule, options) => {
  if (!options.invalidSubfield) return []

  const errors = []
  const visitor = new ScheduleVisitor(schedule)

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

  // TODO: we may include information about referenced codelist
  const error = isIndicator ? {
    message: `Indicator '${value}' is not defined.`,
    error: "invalidIndicator",
  } : {
    message: `Value '${value}' is not defined in codelist.`,
    error: "undefinedCode",
  }

  return [ { ...error, value } ]
}

// See https://format.gbv.de/schema/avram/specification#validation-with-positions
export const validatePositions = (value, positions, options = {})  => {    
  if (!positions || !options.invalidPosition) return []
    
  value = Buffer.from(value, "utf-8")

  const errors = Object.entries(positions)
    .map(([range, definition]) => {
      if (definition.pattern || definition.codes) {
        const [start, end] = range.split("-").map(n => 1*n)

        // TODO: document replacement characters if range is within a unicode character
        // TODO: error if value to short for positions

        const slice = end 
          // utf-8 indexed by byte position
          ? value.slice(start, end+1).toString()
          // one byte as unicode codepoint
          : (start < value.length ? String.fromCodePoint(value[start]) : "") 

        // TODO: error code invalidPosition

        if (slice !== "") {
          return validateValue(slice, definition, options)
        }
      }
    })
    .filter(Boolean)

  // flatten array of arrays
  return errors.reduce((a,cur) => a.concat(cur), [])
}
