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
      { key: "LDR", value: "..." },
      { key: "009", value: "http://example.org/" },
      { key: "101", indicators: [ "0", " " ], subfields: [ "a", "eng" ] },
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
      { key: "003@", subfields: ["0", "123"] },
      { key: "123X", occurrence: "01", subfields: ["a", ""] },
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
      .sort((a,b) => a.key > b.key ? 1 : -1)).deep.equal([
      { key: "/", value: "" },
      { key: "0", value: "0" },
      { key: "00", value: "null" },
      { key: "a", value: "!" },
      { key: "b", value: "" },
    ])
  })
})
