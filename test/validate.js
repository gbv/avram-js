/* eslint-env node, mocha */
import { expect } from "./test.js"
import { validateValue, validatePositions, validateSubfields, Validator } from "../lib/validate.js"

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

describe("Validator", () => {
  const codes = { x: {}, y: {} }
  const schema = {
    fields: {
      A: { 
        subfields: { x: { required: true, pattern: "^[a-z]$" } },
        required: true,
      },
      B: { codes },
      C: {
        subfields: { z: { repeatable: true, codes } },
      },
    },
  }
  const validator = new Validator(schema)
  
  const tests = [
    {
      record: [
        { tag: "A", subfields: [] }, 
        { tag: "A", subfields: ["x", "1"] }, 
        { tag: "Y", occurrence: "1", value: "" },
      ],
      errors: [ 
        { code: "x", message: "Missing subfield 'x'." },
        {
          message: "Value '1' does not match regex pattern '^[a-z]$'.",
          pattern: "^[a-z]$", value: "1",
        },          
        { identifier: "A", message: "Field 'A' must not be repeated." },
        { tag: "Y", occurrence: "1", message: "Unknown field 'Y/1'." },
      ],
    },{
      record: [
        { tag: "Y", value: "" },
        { tag: "B", value: "z" },
        { tag: "C", subfields: ["z", " "] },
      ],
      errors: [ 
        { tag: "Y", message: "Unknown field 'Y'." },
        {
          message: "Value 'z' is not defined in codelist.",
          value: "z",
        },
        {
          message: "Value ' ' is not defined in codelist.",
          value: " ",
        },
        { identifier: "A", message: "Missing field 'A'." },
      ],
    },
  ]

  tests.forEach(({record, errors},i) => {
    it(`validate (${i+1})`, () => {
      expect(validator.validate(record)).deep.equal(errors)
    })
  })

  // TODO: test options
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
