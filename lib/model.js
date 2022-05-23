// See <https://format.gbv.de/schema/avram/specification#data-types>
export class Range {

  constructor(range) {
    const match = range.match(/^([0-9]+)(-([0-9]+))?$/)
    if (match) {
      this.length = match[1].length
      this.from = 1*match[1]
      if (match[3]) {
        this.to = 1*match[3]
        if (match[3].length !== this.length || this.to <= this.from) {
          throw new Error(`No valid range: ${range}`)
        }
      }
    } else {
      throw new Error(`No valid range: ${range}`)
    }
  }

  match(str) {
    if (/^[0-9]+$/.test(str) && str.length === this.length) {
      const value = 1*str
      return this.from <= value && (!this.to || value <= this.to)
    } else {
      return false
    }
  }
}

// See <https://format.gbv.de/schema/avram/specification#field-identifier>
const fieldIdentifierPattern = new RegExp(`^
([0-9A-Z@]+)
(/([0-9]{2}(-[0-9]{2})?)
|x([0-9]{1,2}(-([0-9]{1,2}))?)
)?
$`.replace(/\n/g,""))
export class FieldIdentifier {

  constructor(id) {
    const match = fieldIdentifierPattern.exec(id)
    if (!match) {
      throw new Error(`No valid field identifier: ${id}`)
    }      
    this.tag = match[1]
    if (match[3]) {
      if (!/^0+$/.test(match[3])) {
        this.occurrence = new Range(match[3])
      }          
    } else if (match[5]) {
      this.counter = new Range(match[5])
    }
  }
  
  match(field) {
    const { tag, occurrence, subfields } = field

    if (tag === this.tag) {
      if (this.occurrence) {
        return this.occurrence.match(occurrence || "00")
      } else if (this.counter) { 
        if (subfields) {
          for (let i=0; i<subfields.length; i++) {
            if (subfields[i] === "x") {
              return this.counter.match(subfields[i+1])
            }
          }
        } else {
          return false
        }
      } else {
        return true
      }
    }

    return false
  }
}

// See <https://format.gbv.de/schema/avram/specification#field-schedule>
export class FieldSchedule {
  constructor(schedule) {

    const identifier = field => {
      // FIXME: this is slow, better create a lookup table by tag
      for (let id in schedule) {
        const idObject = new FieldIdentifier(id)
        if (idObject.match(field)) {
          return id
        }
      }
    }

    const handler = {
      get(obj, key) {
        if (key === "identifier") {
          return identifier
        } else {
          return schedule[key]
        }
      },   
    }

    return new Proxy(schedule, handler)
  }
}
