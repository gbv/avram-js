/* eslint-env node, mocha */
import { expect } from "./test.js"

import { jsonRecord } from "../index.js"

const record = [
  ["LDR", null, null, "_", "01471cjm a2200349 a 4500"],
  ["001", null, null, "_", "5674874"],
  ["035", " ", " ", "9", "(DLC)   93707283"],
  ["100", "1", " ", "a", "Sandburg, Carl,", "d", "1878-1967."],
]

const examples = {
  "Javascript MARC record representation": {
    leader: "01471cjm a2200349 a 4500",
    fields: [
      ["001", "5674874"],
      ["035", "  ", "9", "(DLC)   93707283"],
      ["100", "1 ", "a", "Sandburg, Carl,", "d", "1878-1967."],
    ],
  },
  "MARC in JSON (mij)": {
    leader: "01471cjm a2200349 a 4500",
    fields: [
      { "001": "5674874" },
      { "035": {
        ind1: " ",
        ind2: " ",
        subfields: [ { 9: "(DLC)   93707283" } ],
      } },
      { 100: {
        ind1: "1",
        ind2: " ",
        subfields: [
          { a: "Sandburg, Carl," },
          { d: "1878-1967." },
        ],
      } },
    ],
  },
}

describe("jsonRecord", () => {
  it("returns MARC JSON unmodified", () => {
    expect(jsonRecord(record)).deep.equal(record)
  })

  for (let variant in examples) {
    it(`converts ${variant}`, () => {
      expect(jsonRecord(examples[variant])).deep.equal(record)
    })
  }
})
