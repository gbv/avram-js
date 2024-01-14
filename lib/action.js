import fs from "fs"
import { Validator } from "./validate.js"
import { SchemaValidator } from "./schema-validator.js"
import { optionHelp, optionDefault } from "./options.js"
import cli from "./cli.js"
import formats from "../lib/formats.js"

function loadSchema(file, opt) {
  const schema = JSON.parse(fs.readFileSync(file))
  const schemaValidator = new SchemaValidator()
  const errors = schemaValidator.validate(schema)
  const version = cli.pkg.avram + ("family" in schema ? ` ${schema.family}` : "")

  if (errors.length) {
    if (opt.schema || opt.verbose) {
      errors.forEach(e => {
        console.log(e)
      })
    } else {
      console.error(`No valid Avram ${version} schema: ${file}`)
    }
    process.exit(2)
  }

  if (opt.schema) {
    console.log(`${file} is a valid Avram ${version} schema`)
    process.exit()
  }

  return schema
}

export default async (args, opt) => {
  var files = []
  const options = {}

  if (opt.list) {
    console.log("Validation options can be enable/disable by prepending +/-. The following")
    console.log("options (each with default status) are supported to report:\n")
    for (let option in optionDefault) {
      console.log(`${optionDefault[option] ? "+" : "-"}${option}`.padEnd(25)+optionHelp[option])
    }
    return
  }

  for (let arg of args) {
    if (/^[+-][a-zA-Z]+$/.test(arg)) {
      const name = arg.slice(1)
      if (name in optionDefault) {
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

  const schemaFile = opt.schema && !files.length ? "/dev/stdin" : files.shift()
  const schema = loadSchema(schemaFile, opt)

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
    const stream = format.stream(input) // TODO: marcxml parser should emit error on parsing error

    stream.on("data", record => {
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
      if (opt.print) {
        console.log(JSON.stringify(record))
      }
    })
    stream.on("error", reject)
    stream.on("end", resolve)
  })))

  if (opt.verbose && ok) {
    console.log("input is valid against given Avram schema")
  }
  process.exit(ok ? 0 : 2) 
}
