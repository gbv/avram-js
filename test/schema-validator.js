/* eslint-env node, mocha */
import { expect, localFiles, jsonFile } from "./test.js"
import { SchemaValidator } from "../lib/schema-validator.js"

const validSchemaFiles = localFiles("schemas",/\.json$/)
const invalidSchemas = [
  {
    schema: {},
    errors: [ "must have required property 'fields'" ],
  },
]

describe("SchemaValidator", () => {
  const validator = new SchemaValidator()

  for(let file of validSchemaFiles) {
    it(`valid: ${file}`, () => {
      const json = jsonFile(file)
      expect(validator.validate(json)).deep.equal([])
    })
  }

  let n=1
  for(let { schema, errors } of invalidSchemas) {
    it(`detect invalid schema ${n++}`, () => {
      const messages = validator.validate(schema).map(e => e.message)
      expect(messages).deep.equal(errors)
    })
  }
})
