
const form2material = {
  a: "BK", t: "BK",
  m: "CF",
  s: "CR",
  e: "MP", f: "MP",
  c: "MU", d: "MU", i: "MU", j: "MU",
  p: "MX",
  g: "VM", k: "VM", o: "VM", r: "VM",
}

export default {

  // returns record type (a,t,m...) and material type (BK, CF...) if detectable
  detectTypes(fields) {
    const types = []

    const LDR = fields.find(f => f.tag === "LDR" && f.value?.length > 6)
    if (LDR) types.push(LDR.value[6])
    
    // 006 only exists in MARC 21 Bibliographic format
    const form = fields.find(f => f.tag === "006" && f.value?.length).value[0]
    if (form in form2material) types.push(form2material[form])

    return types.length ? types : null
  },
}
