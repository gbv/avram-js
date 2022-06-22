/* eslint-env node, mocha */
import { expect, jsonFile } from "./test.js"
import { validatePositions, validateSubfields } from "../lib/validate.js"
import { Validator } from "../index.js"

const suite = ["validator", "validate-values"]

const asObject = obj => {
  if (!obj) return {}
  if (Array.isArray(obj)) return Object.fromEntries(obj.map(key => [key, true]))
  return obj
}

suite.forEach(name => {
  describe(name, () => {
    jsonFile(`./suite/${name}.json`).forEach((testCase, caseIndex) => {
      const caseDescription = testCase.description || caseIndex + 1
      const { schema, options, tests } = testCase 
      const validator = new Validator(schema, asObject(options))

      tests.forEach((test, index) => {
        const { record, options, errors } = test
        const description = test.description || 
               (caseDescription + (tests.length > 1 ? `-${index + 1}` : ""))
        it(description, () => {
          const result = validator.validate(record, asObject(options))
          if (errors && errors.length) {
            expect(result).deep.equal(errors)
          } else {
            expect(result).deep.equal([])
          }
        })
      })
    })
  })
})

// TODO: move to test suite
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
