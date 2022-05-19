/* eslint-env node, mocha */
import { expect, jsonFile } from "./test.js"

import { Analyzer } from "../index.js"

const fields = {
  "003@": {
    tag: "003@",
    required: true,
    subfields: {
      0: { code: "0", required: true },
    },
  },
}

describe("Analyzer", () => {
  it("start with an empty schema", () => {
    let b = new Analyzer()
    expect(b.schema()).deep.equal({ fields: {} })
    expect(b.count).equal(0)
  })

  it("builds a simple schema", () => {
    let b = new Analyzer({ positions: false })
    b.add([["003@", null, "0", "1234"]])
    expect(b.schema()).deep.equal({
      fields,
      description: "Based on analyzing 1 record",
    })
  })

  it("builds a complex schema", () => {
    let inspect = new Analyzer()
    inspect.add(jsonFile("./files/sandburg.json")[0])
    expect(inspect.schema()).deep.equal(jsonFile("./schemas/sandburg.json"))
  })
})
