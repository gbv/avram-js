#!/usr/bin/env node
import cli from "../lib/cli.js"
import fs from "fs"

import { Validator } from "../lib/validate.js"
import { SchemaValidator } from "../lib/schema-validator.js"
import formats from "../lib/formats.js"

const defaults = Validator.options

const loadSchema = file => {
  if (!file) return {fields:{}}
  const schema = JSON.parse(fs.readFileSync(file))
  const schemaValidator = new SchemaValidator()
  const errors = schemaValidator.validate(schema)
  if (errors.length) {
    console.error(`No valid Avram schema: ${file}`)
    process.exit(1)
  }
  return schema
}

const details = `
An empty string schema argument uses the empty schema. Combining -n and -v
emits parsed records. Supported validation options (enable/disable with +/-):

${Object.keys(defaults).map(o => "  "+(defaults[o] ? "+" : "-")+o).join("\n")}`

cli.usage("avram-validate [options] [validation options] <schema> [<files...>]")
  .description("Validate file(s) with an Avram schema")
  .option(`-f, --format [name]     input format (${Object.keys(formats).join("|")})`)
  .option("-v, --verbose           verbose error messages")
  .option("-n, --no-validate       only parse schema and records.")
  .details(details)
  .action(async (args, opt) => {
    var files = []
    const options = {}

    for (let arg of args) {
      if (/^[+-][a-zA-Z]+$/.test(arg)) {
        const name = arg.slice(1)
        if (name in defaults) {
          options[name] = arg[0] === "+" ? true : false
        } else {
          console.error(`Unknown validation option '${arg}'`)
          process.exit(1)
        }
      } else {
        files.push(arg)
      }
    }

    if (opt.format && !(opt.format in formats)) {
      throw new Error(`Unknown or unsupported format '${opt.format}'`)
    }

    const schema = loadSchema(files.shift())
    const validator = new Validator(schema, options)
         
    var ok = true

    if (!files.length) {
      files = ["-"]
    }

    // validate parallel
    await Promise.all(files.map(file => new Promise((resolve, reject) => {
      var format = opt.format || Object.keys(formats).find(f => file.match(formats[f].pattern))
      format = formats[format]
      if (!format) {
        throw new Error("Please specify input format!")
      }

      const input = file === "-" ? process.stdin : fs.createReadStream(file)
      const stream = format.stream(input)

      stream.on("data", record => {
        if (opt["no-validate"]) {
          if (opt.verbose) {
            console.log(JSON.stringify(record))
          }
        } else {
          const errors = validator.validate(record)
          errors.forEach(e => {
            if (file !== "-") {
              e.file = file
            }
            if (opt.verbose) {
              console.error(JSON.stringify(e))
            } else {
              console.error(e.message)
            }
            ok = false
          })
        }
      })
      stream.on("error", reject)
      stream.on("end", resolve)
    })))

    process.exit(ok ? 0 : 2) 
  })
  .parse(process.argv)
  .catch(e => {
    if (cli.options.verbose) {
      console.error(e)
    } else {
      console.error(`${e}`)
    }
    process.exit(1)
  })
