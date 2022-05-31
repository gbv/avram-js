import { Transform } from "stream"

// convert from marcjs record format
export const fromMarc = record => {
  const fields = record.fields.map(f => f.length === 2
    ? {tag: f[0], value: f[1]}
    : {tag: f[0], indicators: f[1].split(""), subfields: f.slice(2)},
  )
  if ("leader" in record) {
    fields.unshift({tag: "LDR", value: record.leader})
  }
  return fields
}

// convert from PICA/JSON record format (also supports annotated PICA)
export const fromPica = record => {
  return record.map(([tag, occurrence, ...subfields]) => {
    if (subfields.length % 2) {
      subfields.pop()
    }
    return !occurrence || occurrence === "00"
      ? { tag, subfields }
      : { tag, occurrence, subfields }
  })
}

// convert flat key-value record
export const fromKeyValue = record => {
  return Object.entries(record)
    .map(([key, value]) => ({ tag: key, value: `${value}` }))
    .filter(({tag}) => tag !== "") // ignore empty string key
}

const recordTransform = mapping => new Transform({
  objectMode: true,
  transform(record, encoding, callback) {
    this.push(mapping(record))
    callback()
  },
})

export const marcTransform = recordTransform(fromMarc)
export const picaTransform = recordTransform(fromPica)
export const keyValueTransform = recordTransform(fromKeyValue)
