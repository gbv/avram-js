/* eslint-env node, mocha */
import { expect, jsonFile } from "./test.js"
import { Validator } from "../index.js"

const suite = [
  "validator",
  "validate-values",
  "ignore_unknown",
  "subfields",
  "positions",
]

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
