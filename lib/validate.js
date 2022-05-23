

// See <https://format.gbv.de/schema/avram/specification#subfield-validation>
export const validateSubfields = (subfields, definition, options) => {
  const errors = []

  for (let i=0; i<subfields.length; i+=2) {
    const code = subfields[i]
    const subfieldDefinition = definition[code]

    if (code in definition) {
            
      if (!options.ignore_subfield_values) {
        const value = subfields[i+1]
        const valueErrors = validateValue(value, subfieldDefinition, options)
        if (valueErrors) {
          errors.push(...valueErrors)
        }
      }
    } else if(!options.ignore_unknown_subfields) {
      errors.push({
        message: `Unknown subfield ${code}`,
        code,
      })
    }
  }

  return errors.length ? errors : null
}

// See https://format.gbv.de/schema/avram/specification#value-validation
export const validateValue = (value, definition, options = {}) => {
  const { pattern, positions, codes } = definition

  if (pattern) {
    const regexp = new RegExp(pattern, "u")
    if (!regexp.test(value)) {
      const message = `Value '${value}' does not match regex pattern '${pattern}'.`
      return [{ message, value, pattern }]
    }
  }
    
  if (positions) {
    const errors = validatePositions(value, positions, options)
    if (errors) {
      return errors
    }
  }

  // See https://format.gbv.de/schema/avram/specification#validation-against-a-codelist
  // requires referenced codelists (codea and deprecated-codes) to be resolved!
  if (codes && !options.ignore_codes) {
    if (!(value in codes)) {
      if (options.allow_deprecated) {
        const deprecated = definition["deprecated-codes"]
        if (deprecated && value in deprecated) {
          return
        }
      }
      const message = `Value '${value}' is not defined in codelist.`
      return [{message, value}]
    }
  }
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

  if (errors.length) { // flatten array of arrays
    return errors.reduce((a,cur) => a.concat(cur), [])
  }
}
