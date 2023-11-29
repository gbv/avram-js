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
const families = {
  marc: {
    tag: /^(LDR|[0-9]{3})$/,
  },
  pica: {
    tag: /^[012][0-9][0-9][A-Z@]$/,
    identifier(id) {
      const tag = id.substr(0,4)
      if (tag === id) {
        return { tag }
      } else if (id.charAt(4) === "/") {
        if (tag.charAt(0) === "2") {
          throw new Error("Occurrence not allowed on level 2")
        }
        const occurrence = new Range(id.substr(5))
        if (occurrence.length !== 2) {
          throw new Error("Occurrence must be two digits")
        }
        return occurrence.from == "00" && !occurrence.to
          ? { tag } : { tag, occurrence }
      } else if (id.charAt(4) === "x") {
        return { tag, counter: new Range(id.substr(5)) }
      }
    },
  },
  flat: {
    tag: /^(.+)$/,
  },
}

export class FieldIdentifier {

  constructor(id, family) {
    family = family || "flat"
    if (!(family in families)) {
      throw new Error(`Format family '${family}' not supported.`)
    }
    const { tag, identifier } = families[family]
    if (identifier) {
      try {
        Object.assign(this, identifier(id))
      } catch(e) {
        throw new Error(`Invalid ${family} field identifier '${id}: ${e}'`)
      }
    } else {
      this.tag = id
    }
    if (!tag.test(this.tag)) {
      throw new Error(`Invalid ${family} field identifier '${id}'`)
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
  constructor({ family, fields }) {

    const identifier = field => {
      // FIXME: this is slow, better create a lookup table by tag
      for (let id in fields) {
        const idObject = new FieldIdentifier(id, family)
        if (idObject.match(field)) {
          return id
        }
      }
    }

    const handler = {
      get(obj, tag) {
        if (tag === "identifier") {
          return identifier
        } else {
          return fields[tag]
        }
      },   
    }

    return new Proxy(fields, handler)
  }
}

// Checks repeatable/required of (sub)fields in a (sub)field schedule
export class ScheduleVisitor {
  constructor(schedule) {
    this.schedule = schedule
    this.seen = new Set()
  }
  visit(id) {
    if (this.seen.has(id)) {
      if (!this.schedule[id].repeatable) {
        return false
      }
    } else {
      this.seen.add(id)
    }
    return true
  }
  missing() {
    const { schedule, seen } = this 
    return Object.keys(schedule).filter(id => schedule[id].required && !seen.has(id))
  }
}
