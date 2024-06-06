// convert from marcjs record format
const fromMarcjs = record => {
  const fields = record.fields.map(f => f.length === 2
    ? { tag: f[0], value: f[1] }
    : { tag: f[0], indicator1: f[1][0], indicator2: f[1][1], subfields: f.slice(2) },
  )
  if ("leader" in record) {
    fields.unshift({tag: "LDR", value: record.leader})
  }
  return fields
}

// convert from PICA/JSON record format (also supports annotated PICA)
const fromPicajson = record => {
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
const fromObject = (record, options={}) => {
  record = Object.entries(record)
    .map(([tag, value]) => ({ tag, value: `${value}` }))
    .filter(({tag}) => tag !== "") // ignore empty string key
  if ("nullSequence" in options) {
    record = record.filter(({value}) => value !== options.nullSequence)
  }
  return record
}

export const Record = { fromMarcjs, fromPicajson, fromObject }
