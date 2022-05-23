/* eslint-env node, mocha */
import { expect } from "./test.js"
import { validateValue, validatePositions, validateSubfields, validateRecord } from "../lib/validate.js"

const valueTests = [
  [ "x", {} ],
  [ "x", { pattern: "[a-z]" } ],
  [ "x", { pattern: "[0-9]" }, [{
    message:"Value 'x' does not match regex pattern '[0-9]'.",
    pattern: "[0-9]",
  }] ],
  [ "x", { codes: { } }, [{
    message:"Value 'x' is not defined in codelist." }] ],
  [ "x", { codes: { } }, [], { ignore_codes: true } ],
  // TODO: test positions
]

describe("validateValue", () => {
  valueTests.forEach(([value, definition, errors, options]) => {
    it(`validates '${value}'`, () => {
      const result = validateValue(value, definition, options)
      if (errors && errors.length) {
        errors.forEach(e => e.value = value)
        expect(result).deep.equal(errors)
      } else {
        expect(result).deep.equal([])
      }
    })
  })
})

describe("validateRecord", () => {
  const record = [
    { tag: "A", subfields: [] },
  ]
  const schema = {
    fields: {
      A: { subfields: { x: { required: true } } },
    },
  }
  const errors = validateRecord(record, schema, {})
  it("", () => {
    expect(errors).deep.equal([
      { code: "x", message: "Missing subfield 'x'." },
    ])
  })
})

describe("validateSubfields", () => {
  const schedule = {
    0: { required: true },
    a: { repeatable: true },
  }
  const missing = { code: "0", message: "Missing subfield '0'." }
  const repeated = { code: "0", message: "Subfield '0' must not be repeated." }
  const unknown = { code: "x", message: "Unknown subfield 'x'." }
  const tests = [
    {subfields:["0"," ","a"," ","a"," "], errors: []},
    {subfields:["a"," "], errors: [missing]},
    {subfields:["0"," ","0"," "], errors: [repeated]},
    {subfields:["x"," "], errors: [unknown,missing]},
  ]
  it("validates subfields", () => {
    tests.forEach(({subfields, errors}) => {  
      expect(validateSubfields(subfields, schedule, {})).deep.equal(errors)
    })
  })
})

describe("validatePositions", () => {
  const positions = {
    "00": { pattern: "[a-z]" },
    "01-2": { codes: { xy: {} } },
  }
  for (let value of ["axy","bxyz"]) {
    const errors = validatePositions(value, positions)
    expect(errors).deep.equal([])
  }
})
