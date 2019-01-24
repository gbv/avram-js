/**
 *  Create an Avram Schema from sample records.
 */

const marcjson = require('./marcjson')

class Analyzer {
  constructor (options = {}) {
    this.fields = {}
    this.count = 0

    // TODO: document options
    this.options = Object.assign({ positions: true }, options)
  }

  add (record) {
    record = marcjson(record)

    const fields = this.fields
    const fieldIds = {}

    record.forEach(field => {
      var tag; var occ = null; var ind1 = null; var ind2 = null; var content
      var id

      if (field.length % 2) {
        [ tag, ind1, ind2, ...content ] = field
        id = tag
      } else {
        [ tag, occ, ...content ] = field
        if (occ === '') occ = null
        id = occ === null ? tag : `${tag}/${occ}`
      }

      // check whether field is repeated within the record
      if (id in fieldIds) {
        fields[id].repeatable = true
      } else {
        fieldIds[id] = true
      }

      if (fields[id]) {
        fields[id].count++
      } else {
        // field has not been inspected yet
        fields[id] = { count: 0, tag }

        if (id.length > 4) {
          fields[id].occurrence = occ
        }

        if (this.count === 0) {
          fields[id].required = true
        }
      }

      this.addIndicator(fields[id], ind1, ind2)

      if (content.length === 2 && content[0] === '_') {
        // fixed field
        this.addValue(fields[id], content[1])
      } else {
        // variable field
        this.addSubfields(fields[id], content)
      }
    })

    // fields not given in this record are not required
    Object.keys(fields).filter(id => !fieldIds[id])
      .forEach(id => { delete fields[id].required })

    this.count++
  }

  addIndicator (field, indicator1, indicator2) {
    const values = { indicator1, indicator2 }
    for (let ind in values) {
      const code = values[ind]
      if (code === '0' || (code && code !== ' ')) {
        if (values[ind] !== null) {
          if (!field[ind]) {
            field[ind] = { codes: { } }
          }
          field[ind].codes[code] = { }
        }
      }
    }
  }

  addValue (field, content) {
    if (!this.options.positions) return

    // TODO: support key "value" in Avram
    const p = content.length === 1 ? '0' : '0-' + (content.length - 1)
    const { positions } = field
    if (positions) {
      if (!(p in positions) || !(content in positions[p].codes)) {
        field.positions = null
      }
    } else if (positions === undefined) {
      field.positions = { [p]: { codes: { [content]: {} } } }
    }
  }

  addSubfields (field, content) {
    if (field.subfields === undefined) {
      field.subfields = {}
    }
    const { subfields } = field
    const subfieldCodes = {}

    while (content.length) {
      const code = content.shift()
      const value = content.shift()

      // check whether subfield is repeated within this field
      if (subfieldCodes[code]) {
        subfields[code].repeatable = true
      } else {
        subfieldCodes[code] = true
      }

      if (!subfields[code]) {
        subfields[code] = { code }
        if (field.count === 0) {
          subfields[code].required = true
        }
      }

      this.addValue(subfields[code], value)
    }

    // subfields not given in this field are not required
    Object.keys(subfields).filter(id => !subfieldCodes[id])
      .forEach(id => { delete subfields[id].required })
  }

  schema () {
    const schema = {}
    schema.fields = _clone(this.fields)
    const { count } = this
    if (count) {
      schema.description = `Based on analyzing ${count} record` + (count > 1 ? 's' : '')
    }
    return schema
  }
}

function _clone (data) {
  if (typeof data === 'object' && data !== null) {
    return Object.keys(data).sort().reduce(
      (obj, key) => {
        if (key !== 'count' && data[key] !== null) {
          obj[key] = _clone(data[key])
        }
        return obj
      }, {})
  } else {
    return data
  }
}

module.exports = Analyzer
