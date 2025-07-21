import fs from "fs"
import path from "path"

import { importIfInstalled } from "./util.js"

const ejs = await importIfInstalled("ejs")
const __dirname = new URL(".", import.meta.url).pathname

const template = fs.readFileSync(path.resolve(__dirname, "./html.ejs")).toString()

export default (schema, opt={}) => {
  if (ejs) {
    return ejs.render(template, { ...schema, ...opt })
  }
  throw new Error("Please install ejs!")
}
