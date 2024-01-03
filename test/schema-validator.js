/* eslint-env node, mocha */
import { expect, localFiles, jsonFile } from "./test.js"
import { SchemaValidator } from "../lib/schema-validator.js"

const schemaFiles = localFiles("schemas",/\.json$/)
const schemaSuite = jsonFile("schema-suite.json")

describe("SchemaValidator", () => {
  const validator = new SchemaValidator()

  for(let file of schemaFiles) {
    if (/invalid\.json$/.test(file)) {
      it(`invalid: ${file}`, () => {
        expect(validator.validate(jsonFile(file))).to.not.be.empty
      })
    } else {
      it(`valid: ${file}`, () => {
        expect(validator.validate(jsonFile(file))).deep.equal([])
      })
    }
  }

  let n=1
  for(let { schema, errors } of schemaSuite.invalid) {
    it(`detect invalid schema ${n++}`, () => {
      const found = validator.validate(schema)
      expect(found.length).equal(errors.length)
      for (let i=0; i<found.length; i++) {
        for (let key in errors[i]) {
          expect(found[i][key]).deep.equal(errors[i][key])
        }
      }
    })
  }

  n=1
  for(let schema of schemaSuite.valid) {
    it(`pass valid schema ${n++}`, () => {
      expect(validator.validate(schema)).deep.equal([])
    })
  }

})
