/* eslint-env node, mocha */
import { expect } from "./test.js"
import { SchemaValidator } from "../lib/schema-validator.js"

describe("SchemaValidator", () => {
  const validator = new SchemaValidator()
  it("detect valid schema", () => {
    expect(validator.validate({fields:{}})).deep.equal([])
  })
})
