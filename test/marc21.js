/* eslint-env node, mocha */
import { expect } from "./test.js"
import marc21 from "../lib/extension/marc21.js"

const tests = [
  {
    fields:  [
      {tag:"LDR"}, // should not crash
      {tag:"LDR",value:"******t"},
      {tag:"006"}, // should not crash
      {tag:"006",value:"a"},
    ],
    types: ["t","BK"],
  },{
    fields:  [
      {tag:"LDR",value:"******+"},
      {tag:"006",value:"x"},
    ],
    types: ["+"],
  }, 
]

describe("MARC21", () => {
  it("detectTypes", () => {
    for (let {fields, types} of tests) {
      expect(marc21.detectTypes(fields)).deep.equal(types)
    }
  })
})
