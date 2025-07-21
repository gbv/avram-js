import { expect } from "chai"
import fs from "fs"
import path from "path"

const __dirname = new URL(".", import.meta.url).pathname
const localPath = name => path.resolve(__dirname, name)
const readFile = path => fs.readFileSync(localPath(path))
const jsonFile = path => JSON.parse(readFile(path))
const localFiles = (dir, pattern) =>
  fs.readdirSync(localPath(dir))
    .filter(file => pattern.test(file))
    .map(file => path.join(dir, file))

export { expect, localPath, localFiles, jsonFile }
