/**
 * Normalize record to MARC/JSON or PICA/JSON
 */

export default function jsonRecord (input) {
  if (Array.isArray(input)) {
    return input
  }

  const { leader, fields } = input
  const record = []

  if (leader) {
    record.push(["LDR", null, null, "_", leader])
  }

  if (fields && fields.length) {
    // Javascript MARC record representation
    if (Array.isArray(fields[0])) {
      fields.forEach(field => {
        if (field.length === 2) {
          record.push([field[0], null, null, "_", field[1]])
        } else {
          const tag = field[0]
          const indicators = field[1].split("")
          const subfields = field.splice(2)
          record.push([tag, ...indicators, ...subfields])
        }
      })
    } else if (typeof fields[0] === "object") {
      // MARC in JSON (MiJ)
      fields.forEach(field => {
        for (let tag in field) {
          const value = field[tag]
          if (typeof value === "object") {
            const list = value.subfields.reduce((list, sf) => {
              for (let code in sf) {
                list.push(code, sf[code])
              }
              return list
            }, [])
            record.push([tag, value.ind1, value.ind2, ...list])
          } else {
            record.push([tag, null, null, "_", value])
          }
        }
      })
    }
  }

  return record
}
