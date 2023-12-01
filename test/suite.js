/* eslint-env node, mocha */
import { expect, localFiles, jsonFile } from "./test.js"
import { Validator } from "../index.js"

const asObject = obj => {
  if (!obj) return {}
  if (Array.isArray(obj)) return Object.fromEntries(obj.map(key => [key, true]))
  return obj
}

localFiles("suite",/\.json$/).forEach(file => {
  describe(file, () => {
    jsonFile(file).forEach((testCase, caseIndex) => {
      const caseDescription = testCase.description || caseIndex + 1
      const { schema, options, tests } = testCase 
      const validator = new Validator(schema, asObject(options))

      tests.forEach((test, index) => {
        const { options, errors } = test
        const description = test.description || 
               (caseDescription + (tests.length > 1 ? `-${index + 1}` : ""))
        it(description, () => {
          const result = test.records
            ? validator.validateRecords(test.records, asObject(options))
            : validator.validate(test.record, asObject(options))
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
