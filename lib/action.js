import fs from "fs"
import { Validator } from "./validate.js"
import { SchemaValidator } from "./schema-validator.js"
import { optionDefault } from "./options.js"
import cli from "./cli.js"
import { formats } from "../lib/formats.js"
import marc21Extension from "../lib/extension/marc21.js"
import schema2html from "../lib/html.js"

export async function avramAction(args, opt) {
  const files = []
  const validationOptions = {}

  for (let arg of args) {
    if (/^[+-][a-zA-Z]+$/.test(arg)) {
      const name = arg.slice(1)
      if (name in optionDefault) {
        validationOptions[name] = arg[0] === "+" ? true : false
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

  // load and validate schema
  const schemaFile = (opt.schema && !files.length) ? "/dev/stdin" : files.shift()
  if (schemaFile === undefined) throw new Error("Missing schema argument")

  const schema = JSON.parse(fs.readFileSync(schemaFile))
  const version = cli.pkg.avram + ("family" in schema ? ` ${schema.family}` : "")
  const errors = opt.novalid ? [] : (new SchemaValidator()).validate(schema)

  if (errors.length) {
    if (opt.schema || opt.verbose) {
      errors.forEach(e => console.log(JSON.stringify(e)))
      return 2
    } else {
      throw new Error(`No valid Avram ${version} schema: ${schemaFile}`)
    }
  } else if (opt.schema) {
    console.log(`${schemaFile} is a valid Avram ${version} schema`)
    return 0
  }
  if (opt.document) {
    if (opt.document == "html") {
      console.log(schema2html(schema, { schemaFile }))
    } else {
      console.error(`Unknown document format ${opt.document} try html instead!`)
      return 1
    }
    return 0
  }

  // load extensions
  opt.extension = (opt.extension||"").split(",").filter(Boolean).map(e => {
    if (e === "marc" || e === "marc21") {
      return marc21Extension
    } else {
      throw new Error(`Unknown extension ${e}`)
    }
  })

  // run validation of records
  if (!files.length) files.push("-")
  opt.types = typeof opt.type == "string" ? opt.type.split(",") : []

  const ok = await validateFiles(files, schema, validationOptions, opt)

  if (opt.verbose && ok) {
    console.log("input is valid against given Avram schema")
  }

  return ok ? 0 : 2
}

// opt supports: type, format, print, verbose, nullSequence
export async function validateFiles(files, schema, validationOptions, opt) {
  const { format, verbose, print } = opt
 
  const validator = new Validator(schema, validationOptions, opt.extension)
         
  var ok = true

  // validate parallel
  await Promise.all(files.map(file => new Promise((resolve, reject) => {
    const inputFormat = formats[format || Object.keys(formats).find(f => file.match(formats[f].pattern))]
    if (!inputFormat) {
      throw new Error("Please specify input format!")
    }

    const input = file === "-" ? process.stdin : fs.createReadStream(file)
    const stream = inputFormat.stream(input, opt) // TODO: marcxml parser should emit error on parsing error

    stream.on("data", fields => {
      var types = opt.types

      // FIXME: move to validator? But then print does not show enriched types
      if (opt.extension && (!types || !types.length)) {
        types = opt.extension.filter(e => "detectTypes" in e)
          .map(e => e.detectTypes(fields)).filter(Boolean).flat()
      }
        
      const record = { fields, types }
      const errors = validator.validate(record)
      errors.forEach(e => {
        if (file !== "-") {
          e.file = file
        }
        if (verbose) {
          console.error(JSON.stringify(e))
        } else {
          console.error(e.message)
        }
        ok = false
      })
      if (print) {
        record.fields = record.fields.map(({tag,value}) => ({key:tag,value}))
        console.log(JSON.stringify(record))
      }
    })
    stream.on("error", reject)
    stream.on("end", resolve)
  })))

  return ok
}
