/**
 * Normalize record to MARC JSON or PICA JSON
 */

function marcjson (record) {
  if (Array.isArray(record)) {
    return record
  }

  const { leader, fields } = record
  const marc = []

  if (leader) {
    marc.push(['LDR', null, null, '_', record.leader])
  }

  if (fields && fields.length) {
    // Javascript MARC record representation
    if (Array.isArray(fields[0])) {
      fields.forEach(field => {
        if (field.length === 2) {
          marc.push([field[0], null, null, '_', field[1]])
        } else {
          const tag = field[0]
          const indicators = field[1].split('')
          const subfields = field.splice(2)
          marc.push([tag, ...indicators, ...subfields])
        }
      })
    } else if (typeof fields[0] === 'object') {
      // MARC in JSON (MiJ)
      fields.forEach(field => {
        for (let tag in field) {
          const value = field[tag]
          if (typeof value === 'object') {
            const list = value.subfields.reduce((list, sf) => {
              for (let code in sf) {
                list.push(code, sf[code])
              }
              return list
            }, [])
            marc.push([tag, value.ind1, value.ind2, ...list])
          } else {
            marc.push([tag, null, null, '_', value])
          }
        }
      })
    }
  }

  return marc
}

module.exports = marcjson
