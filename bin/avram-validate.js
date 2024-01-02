#!/usr/bin/env node
import cli from "../lib/cli.js"
import fs from "fs"

import { Validator } from "../lib/validate.js"
import { SchemaValidator } from "../lib/schema-validator.js"
import formats from "../lib/formats.js"

const defaults = Validator.options
const optionHelp = {
  invalidRecord: "invalid records",
  undefinedField: "fields not found in the field schedule",
  nonrepeatableField: "repetition of non-repeatable fields",
  missingField: "required fields missing from a record",
  invalidIndicator: "field not matching expected validation definition",
  invalidFieldValue: "invalid flat field values",
  invalidSubfield: "invalid subfields (subsumes all subfield errors)",
  undefinedSubfield: "subfields not found in the subfield schedule",
  nonrepeatableSubfield: "repetition of non-repeatable subfields",
  missingSubfield: "required subfields missing from a field",
  invalidSubfieldValue: "invalid subfield values",
  patternMismatch: "values not matching an expected pattern",
  invalidPosition: "values not matching expected positions",
  undefinedCode: "values not found in an expected codelist",
  undefinedCodelist: "non-resolveable codelist references",
  countRecord: "expected number of records not met",
  countField: "expected number of fields not met", 
  countSubfield: "expected number of subfields not met",
//  externalRule: "violation of external rules",
}

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

cli.usage("avram-validate [options] [validation options] <schema> [<files...>]")
  .description("Validate file(s) with an Avram schema")
  .option(`-f, --format [name]     input format (${Object.keys(formats).join("|")})`)
  .option("-v, --verbose           verbose error messages")
  .option("-n, --no-validate       only parse schema and records")
  .option("-l, --list              list supported validation options")
  .details(`
An empty string schema argument uses the empty schema. Combining -n and -v
emits parsed records. See supported validation options with --list.`)
  .action(async (args, opt) => {
    var files = []
    const options = {}

    if (opt.list) {
      console.log("Validation options can be enable/disable by prepending +/-. The following")
      console.log("options (each with default status) are supported to report:\n")
      for (let option in defaults) {
        console.log(`${defaults[option] ? "+" : "-"}${option}`.padEnd(25)+optionHelp[option])
      }
      return
    }

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
