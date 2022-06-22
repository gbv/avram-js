/* eslint-env node, mocha */
import { expect } from "./test.js"
import { Record } from "../index.js"

describe("fromMarc", () => {
  const record = {
    leader: "...",
    fields: [
      [ "009", "http://example.org/" ],
      [ "101", "0 ", "a", "eng" ],
    ],
  }
  it("converts marcjs record", () => {
    expect(Record.fromMarc(record)).deep.equal([
      { tag: "LDR", value: "..." },
      { tag: "009", value: "http://example.org/" },
      { tag: "101", indicators: [ "0", " " ], subfields: [ "a", "eng" ] },
    ])
  })
})

describe("fromPica", () => {
  const record = [
    ["003@", "", "0", "123"],
    ["123X", "01", "a", "", "+"],
  ]
  it("converts pica record", () => {
    expect(Record.fromPica(record)).deep.equal([
      { tag: "003@", subfields: ["0", "123"] },
      { tag: "123X", occurrence: "01", subfields: ["a", ""] },
    ])
  })
})

describe("fromFlat", () => {
  const record = {
    "": "?",
    "/": "",
    0: 0,
    "00": null,
    a: { toString: () => "!" },
    b: [],
  }
  it("converts object with key-values", () => {
    expect(Record.fromFlat(record)
      .sort((a,b) => a.tag > b.tag ? 1 : -1)).deep.equal([
      { tag: "/", value: "" },
      { tag: "0", value: "0" },
      { tag: "00", value: "null" },
      { tag: "a", value: "!" },
      { tag: "b", value: "" },
    ])
  })
})
