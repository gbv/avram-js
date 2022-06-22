import { FieldSchedule, ScheduleVisitor } from "./model.js"

// public interface
export class Validator {

  constructor(schema, options={}) {
    // TODO: validate schema and throw error if malformed
    // TODO: expand codelists
    this.schema = schema
    this.options = options
    this.schedule = new FieldSchedule(schema)
    // TODO: allow_deprecated for field schedule
  }

  // See <https://format.gbv.de/schema/avram/specification#record-validation>
  validate(record, options={}) {
    options = { ...this.options, ...options }

    const { schedule } = this
    const visitor = new ScheduleVisitor(schedule)
    const errors = []

    for (let field of record) {
      var id = schedule.identifier(field)
      if (id) {
        const definition = schedule[id]
        const fieldErrors = validateFieldContent(field, definition, options)
        errors.push(...fieldErrors)
        if (!visitor.visit(id)) {
          const message = `Field '${id}' must not be repeated.`
          errors.push({message, identifier: id})
        }
      } else if (!options.ignore_unknown_fields) {
        const { tag, occurrence } = field
        errors.push( occurrence
          ? {message: `Unknown field '${tag}/${occurrence}'.`, tag, occurrence}
          : {message: `Unknown field '${tag}'.`, tag})
      }
    }

    const missing = visitor.missing().map(id => ({
      message: `Missing field '${id}'.`,
      identifier: id,
    }))
    errors.push(...missing)

    return errors
  }
}

Validator.options = {
  ignore_unknown_fields: true,
  allow_deprecated: true,
  ignore_subfields: true,
  ignore_unknown_subfields: true,
  // check_subfield_order: true,
  ignore_values: true,
  ignore_codes: true,
  ignore_unknown_codelists: true,
}

const validateFieldContent = (field, definition, options) => {

  // TODO: indicator1, indicator2

  if (field.value || field.value === "") {
    // fixed field
    return validateValue(field.value, definition, options)
  } else {
    // variable field
    return validateSubfields(field.subfields, definition.subfields, options)
  }
}

// See <https://format.gbv.de/schema/avram/specification#subfield-validation>
export const validateSubfields = (subfields, schedule, options) => {
  const errors = []
  const visitor = new ScheduleVisitor(schedule)

  // TODO: check subfield order

  for (let i=0; i<subfields.length; i+=2) {
    const code = subfields[i]
    const subfieldDefinition = schedule[code]

    if (code in schedule) {
      if (!visitor.visit(code)) {
        const message = `Subfield '${code}' must not be repeated.`
        errors.push({message, code})
      }
      if (!options.ignore_subfield_values) {
        const value = subfields[i+1]
        const valueErrors = validateValue(value, subfieldDefinition, options)
        if (valueErrors) {
          errors.push(...valueErrors)
        }
      }
    } else if(!options.ignore_unknown_subfields) {
      errors.push({
        message: `Unknown subfield '${code}'.`,
        code,
      })
    }
  }

  const missing = visitor.missing().map(code => ({
    message: `Missing subfield '${code}'.`, code,
  }))
  errors.push(...missing)

  return errors
}

// See https://format.gbv.de/schema/avram/specification#value-validation
export const validateValue = (value, definition, options = {}) => {
  const { pattern, positions, codes } = definition
  const errors = []

  if (pattern) {
    const regexp = new RegExp(pattern, "u")
    if (!regexp.test(value)) {
      const message = `Value '${value}' does not match regex pattern '${pattern}'.`
      errors.push({ message, value, pattern })
    }
  }

  if (positions) {
    errors.push(...validatePositions(value, positions, options))
  }

  // See https://format.gbv.de/schema/avram/specification#validation-against-a-codelist
  // requires referenced codelists (codes and deprecated-codes) to be resolved!
  if (codes && !options.ignore_codes) {
    if (!(value in codes)) {
      if (options.allow_deprecated) {
        const deprecated = definition["deprecated-codes"]
        if (deprecated && value in deprecated) {
          return errors
        }
      }
      const message = `Value '${value}' is not defined in codelist.`
      errors.push({message, value})
    }
  }

  return errors
}

// See https://format.gbv.de/schema/avram/specification#validation-against-positions
export const validatePositions = (value, positions, options = {})  => {    
  value = Buffer.from(value, "utf-8")

  const errors = Object.entries(positions)
    .map(([range, definition]) => {
      if (definition.pattern || definition.codes) {
        const [start, end] = range.split("-").map(n => 1*n)

        // TODO: document replacement characters if range is within a unicode character

        const slice = end 
          // utf-8 indexed by byte position
          ? value.slice(start, end+1).toString()
          // one byte as unicode codepoint
          : (start < value.length ? String.fromCodePoint(value[start]) : "") 

        if (slice !== "") {
          return validateValue(slice, definition, options)
        }
      }
    })
    .filter(Boolean)

  // flatten array of arrays
  return errors.reduce((a,cur) => a.concat(cur), [])
}
