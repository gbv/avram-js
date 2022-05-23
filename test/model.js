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
  const { valid, invalid } = jsonFile("./files/field-identifiers.json")

  it("parses valid field identifiers", () => {
    /* eslint-disable no-unused-vars */
    Object.entries(valid).forEach(([id, {match, nomatch, ...result}]) => {
      expect(new FieldIdentifier(id)).deep.equal(result)
    })
  })

  it("detects invalid field identifiers", () => {
    invalid.forEach(id => {
      expect(() => new FieldIdentifier(id)).to.throw()
    })
  })

  it("matches fields", () => {
    Object.entries(valid).forEach(([id, {match,nomatch}]) => {
      const identifier = new FieldIdentifier(id)
      if (match) {
        match.forEach(value => expect(identifier.match(value)).ok)
      }
      if (nomatch) {
        nomatch.forEach(value => expect(id.match(value)).not.ok)
      }
    })
  })
})

describe("FieldSchedule", () => {
  const ids = ["X", "012X/03", "000X/00-02", "234Xx1" ].sort()
  const schedule = new FieldSchedule(Object.fromEntries(ids.map(id => [id, {label: id}])))

  it("acts like an object", () => {
    expect(Object.keys(schedule)).deep.equal(ids)
  })

  it("contains fields", () => {
    expect("X" in schedule).ok
    expect(schedule["X"]).deep.equal({label: "X"})
    expect("identifier" in schedule).not.ok
    expect(schedule.identifier({ tag: "012X", occurrence: "03" })).equal("012X/03")
    expect(schedule.identifier({ tag: "000X", occurrence: "02" })).equal("000X/00-02")
    expect(schedule.identifier({ tag: "000X" })).equal("000X/00-02")
    expect(schedule.identifier({ tag: "234X", subfields: ["x","1"] })).equal("234Xx1")
    expect(schedule.identifier({ tag: "234X", subfields: ["y","1"] })).not.ok
    expect(schedule.identifier({ tag: "234X" })).not.ok
  })
})

