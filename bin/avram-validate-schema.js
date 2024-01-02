#!/usr/bin/env node
import cli from "../lib/cli.js"
import fs from "fs"

import { SchemaValidator } from "../lib/schema-validator.js"

const version = cli.pkg.avram

cli.usage("avram-validate-schemas [options] <schema>")
  .description(`Validate Avram schema file against Avram specification ${version}`)
  .option("-v, --verbose           verbose error messages")
  .action(async ([schemaFile]) => {
    const schema = JSON.parse(fs.readFileSync(schemaFile))
    const validator = new SchemaValidator()
          
    const errors = validator.validate(schema)
    if (errors.length) {
      errors.forEach(e => {
        console.log(e)
      })
      process.exit(2)
    } else {
      console.log(`${schemaFile} is a valid Avram ${version} schema`)
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
