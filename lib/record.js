// convert from marcjs record format
const fromMarc = record => {
  const fields = record.fields.map(f => f.length === 2
    ? {key: f[0], value: f[1]}
    : {key: f[0], indicators: f[1].split(""), subfields: f.slice(2)},
  )
  if ("leader" in record) {
    fields.unshift({key: "LDR", value: record.leader})
  }
  return fields
}

// convert from PICA/JSON record format (also supports annotated PICA)
const fromPica = record => {
  return record.map(([key, occurrence, ...subfields]) => {
    if (subfields.length % 2) {
      subfields.pop()
    }
    return !occurrence || occurrence === "00"
      ? { key, subfields }
      : { key, occurrence, subfields }
  })
}

// convert flat key-value record
const fromFlat = record => {
  return Object.entries(record)
    .map(([key, value]) => ({ key: key, value: `${value}` }))
    .filter(({key}) => key !== "") // ignore empty string key
}

export const Record = { fromMarc, fromPica, fromFlat }
