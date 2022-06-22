#!/usr/bin/env node
import cli from "../lib/cli.js"
import fs from "fs"

import { Validator } from "../lib/validate.js"
import formats from "../lib/formats.js"

const details = `
An empty string schema argument uses the empty schema. Combining -n and -v emits
parsed records. Validation options (separable with any of [ ,|+]):
${Object.keys(Validator.options).map(o => "  "+o).join("\n")}`

cli.usage("avram-validate [options] <schema> [<files...>]")
  .description("Validate file(s) with an Avram schema")
  .option(`-f, --format [name]     input format (${Object.keys(formats).join("|")})`)
  .option("-v, --verbose           verbose error messages")
  .option("-n, --no-validate       only parse schema and records.")
  .option("-o, --options [options] set validation options.") 
  .details(details)
  .action(async (files, opt) => {
    
    var options = (opt.options||"").split(/[ ,|+]/).filter(Boolean)
    options.filter(o => !(o in Validator.options))
      .forEach(o => console.warn(`Unknown validation option '${o}'`))
    options = Object.fromEntries(options.map(name => [name,true]))

    if (opt.format && !(opt.format in formats)) {
      throw new Error(`Unknown or unsupported format '${opt.format}'`)
    }

    var schema = files.shift()
    schema = schema ? JSON.parse(fs.readFileSync(schema)) : {fields:{}}      
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
