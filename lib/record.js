// convert from marcjs record format
const fromMarcjs = record => {
  const fields = record.fields.map(f => f.length === 2
    ? { tag: f[0], value: f[1] }
    : { tag: f[0], indicators: f[1].split(""), subfields: f.slice(2) },
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
const fromObject = record => {
  return Object.entries(record)
    .map(([tag, value]) => ({ tag, value: `${value}` }))
    .filter(({tag}) => tag !== "") // ignore empty string key
}

export const Record = { fromMarcjs, fromPicajson, fromObject }
