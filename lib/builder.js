/**
 *  Create an Avram Schema from sample records.
 */

const marcjson = require('./marcjson')

class Builder {
  constructor () {
    this.fields = {}
    this.count = 0
  }

  add (record) {
    record = marcjson(record)

    const fields = this.fields
    const fieldIds = {}

    record.forEach(field => {
      const [ tag, occ, ...content ] = field

      // PICA::Data adds: && tag[0] === '0' ???
      const id = (occ !== null && occ !== '') ? `${tag}/${occ}` : tag

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
        fields[id] = {
          count: 0,
          tag,
          subfields: {}
        }

        if (id.length > 4) {
          fields[id].occurrence = occ
        }

        if (this.count === 0) {
          fields[id].required = true
        }
      }

      const { subfields } = fields[id]
      const subfieldCodes = {}

      while (content.length) {
        const code = content.shift()
        content.shift() // value

        // check whether subfield is repeated within this field
        if (subfieldCodes[code]) {
          subfields[code].repeatable = true
        } else {
          subfieldCodes[code] = true
        }

        if (!subfields[code]) {
          subfields[code] = { code }
          if (fields[id].count === 0) {
            subfields[code].required = true
          }
        }
      }

      // subfields not given in this field are not required
      Object.keys(subfields).filter(id => !subfieldCodes[id])
        .forEach(id => { delete subfields[id].required })
    })

    // fields not given in this record are not required
    Object.keys(fields).filter(id => !fieldIds[id])
      .forEach(id => { delete fields[id].required })

    this.count++
  }

  schema () {
    return _clone(this)
  }
}

function _clone (data) {
  if (typeof data === 'object' && data !== null) {
    return Object.keys(data).reduce(
      (obj, key) => {
        if (key !== 'count') {
          obj[key] = _clone(data[key])
        }
        return obj
      }, {})
  } else {
    return data
  }
}

module.exports = Builder
