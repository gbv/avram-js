/* eslint-env node, mocha */
import { expect, localPath, jsonFile } from "./test.js"
import { validateFiles } from "../lib/action.js"

import marc21 from "../lib/extension/marc21.js"

const tests = [
  {
    fields:  [
      {tag:"LDR"}, // should not crash
      {tag:"LDR",value:"******t"},
      {tag:"006"}, // should not crash
      {tag:"006",value:"a*"},
      {tag:"007"}, // should not crash
      {tag:"007",value:"c*"},
    ],
    types: ["t","BK","007c"],
  },{
    fields:  [
      {tag:"LDR",value:"******+"},
      {tag:"006",value:"x"},
    ],
    types: ["+"],
  }, 
]

describe("MARC21 extension", () => {
  it("detectTypes", () => {
    for (let {fields, types} of tests) {
      expect(marc21.detectTypes(fields)).deep.equal(types)
    }
  })

  it("validates MARC", async () => {
    const schema = jsonFile("schemas/marc21-bibliographic.json")
    const files = [localPath("files/sandburg.xml")]
    const result = await validateFiles(files, schema, {}, {})
    expect(result).equal(true)

    // TODO: set type to e.g. ["c","CF"] and expect errors

  })
})
