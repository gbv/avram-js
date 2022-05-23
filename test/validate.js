/* eslint-env node, mocha */
import { expect } from "./test.js"
import { validateValue, validatePositions } from "../lib/validate.js"

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
        expect(result).not.ok
      }
    })
  })
})

describe("validateRecord", () => {
  // TODO
})

describe("validateSubfields", () => {
  // TODO
})

describe("validatePositions", () => {
  const positions = {
    "00": { pattern: "[a-z]" },
    "01-2": { codes: { xy: {} } },
  }

  for (let value of ["axy","bxyz"]) {
    const errors = validatePositions(value, positions)
    expect(errors).not.ok
  }

})
