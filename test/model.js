/* eslint-env node, mocha */
import { expect, jsonFile } from "./test.js"
import { Range, FieldIdentifier, FieldSchedule } from "../lib/model.js"

describe("Range", () => {
  it("matches values", () => {
    const range1 = new Range("03")
    const range2 = new Range("03-12")
    expect(range1.match("03")).be.ok
    expect(range2.match("03")).be.ok
    expect(range2.match("3")).not.ok
  })

  it("detects invalid ranges", () => {
    ["x","","0-99"].forEach(range => {
      expect(() => new Range(range)).to.throw()
    })
  })    
})

describe("FieldIdentifier", () => {
  jsonFile("./files/field-identifiers.json").forEach(({ family, valid, invalid }) => {

    it(`parses valid ${family} field identifiers`, () => {
    /* eslint-disable no-unused-vars */
      Object.entries(valid).forEach(([id, {match, nomatch, ...result}]) => {
        expect(new FieldIdentifier(id, family)).deep.equal(result)
      })
    })

    it(`detects invalid ${family} field identifiers`, () => {
      invalid.forEach(id => {
        expect(() => new FieldIdentifier(id, family))
          .to.throw(`Invalid ${family} field identifier '${id}`)
      })
    })

    it(`matches ${family} fields`, () => {
      Object.entries(valid).forEach(([id, {match,nomatch}]) => {
        const identifier = new FieldIdentifier(id, family)
        if (match) {
          match.forEach(value => expect(identifier.match(value)).ok)
        }
        if (nomatch) {
          nomatch.forEach(value => expect(id.match(value)).not.ok)
        }
      })
    })

    it("ignores occurrence /00 in pica family", () => {
      expect(new FieldIdentifier("123X/00", "pica")).deep.equal({key: "123X"})
    })

    it("rejects unknown format family", () => {
      expect(() => new FieldIdentifier("x", "?!"))
        .to.throw("Format family '?!' not supported.")
    })
  })
})

describe("FieldSchedule (pica)", () => {
  const ids = ["003@", "012X/03", "000X/00-02", "234Xx1" ].sort()
  const fields = Object.fromEntries(ids.map(id => [id, {label: id}]))
  const schedule = new FieldSchedule({ fields, family: "pica" })

  it("acts like an object", () => {
    expect(Object.keys(schedule)).deep.equal(ids)
  })

  it("contains fields", () => {
    expect("003@" in schedule).ok
    expect(schedule["003@"]).deep.equal({label: "003@"})
    expect("identifier" in schedule).not.ok
    expect(schedule.identifier({ key: "012X", occurrence: "03" })).equal("012X/03")
    expect(schedule.identifier({ key: "000X", occurrence: "02" })).equal("000X/00-02")
    expect(schedule.identifier({ key: "000X" })).equal("000X/00-02")
    expect(schedule.identifier({ key: "234X", subfields: ["x","1"] })).equal("234Xx1")
    expect(schedule.identifier({ key: "234X", subfields: ["y","1"] })).not.ok
    expect(schedule.identifier({ key: "234X" })).not.ok
  })
})

