/* eslint-env node, mocha */
import { expect, jsonFile } from "./test.js"
import { FieldIdentifier } from "../lib/model.js"

describe("FieldIdentifier", () => {
  const { valid, invalid } = jsonFile("./files/field-identifiers.json")

  it("parses valid field identifiers", () => {
    Object.entries(valid).forEach(([id, result]) => {
      expect(new FieldIdentifier(id)).deep.equal(result)
    })
  })

  it("detects invalid field identifiers", () => {
    invalid.forEach(id => {
      expect(() => new FieldIdentifier(id)).to.throw()
    })
  })
})
