import chai from "chai"
const { expect } = chai

import fs from "fs"
import path from "path"

const __dirname = new URL(".", import.meta.url).pathname
const file = name => path.resolve(__dirname, name)
const readFile = path => fs.readFileSync(file(path))
const jsonFile = path => JSON.parse(readFile(path))

export { expect, jsonFile }
