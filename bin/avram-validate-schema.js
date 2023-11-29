#!/usr/bin/env node
import cli from "../lib/cli.js"
import fs from "fs"

import { SchemaValidator } from "../lib/schema-validator.js"

cli.usage("avram-validate-schemas [options] <schema>")
  .description("Validate Avram schema file against Avram specification")
  .option("-v, --verbose           verbose error messages")
  .action(async ([schemaFile], opt) => {
    const schema = JSON.parse(fs.readFileSync(schemaFile))
    const validator = new SchemaValidator()
          
    const errors = validator.validate(schema)
    if (errors.length) {
      errors.forEach(e => {
        console.log(e)
      })
      process.exit(2)
    } else {
      if (opt.verbose) {
        console.log(`${schemaFile} is a valid Avram schema`)
      }
    }
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

 
