/* eslint-env node, mocha */
import { expect } from "./test.js"
import { fromMarc, fromKeyValue } from "../lib/record.js"

describe("fromMarc", () => {
  const record = {
    leader: "...",
    fields: [
      [ "009", "http://example.org/" ],
      [ "101", "0 ", "a", "eng" ],
    ],
  }
  it("converts marcjs record", () => {
    expect(fromMarc(record)).deep.equal([
      { tag: "LDR", value: "..." },
      { tag: "009", value: "http://example.org/" },
      { tag: "101", indicators: [ "0", " " ], subfields: [ "a", "eng" ] },
    ])
  })
})

describe("fromKeyValue", () => {
  const record = {
    "": "?",
    "/": "",
    0: 0,
    "00": null,
    a: { toString: () => "!" },
    b: [],
  }
  it("converts object with key-values", () => {
    expect(fromKeyValue(record)
      .sort((a,b) => a.tag > b.tag ? 1 : -1)).deep.equal([
      { tag: "/", value: "" },
      { tag: "0", value: "0" },
      { tag: "00", value: "null" },
      { tag: "a", value: "!" },
      { tag: "b", value: "" },
    ])
  })
})
