#!/usr/bin/env node
import cli from "../lib/cli.js"
import { formats, missing } from "../lib/formats.js"
import avramAction from "../lib/action.js"

console.log(missing)

import ajv from "../lib/ajv.js"
var details = ajv ? "" : `
Install ajv and ajv-formats for better validation of schemas.`

if (missing.size) details += `
Install ${[...missing.keys()].join(", ")} for additional input formats.`

cli.usage("avram [options] [validation options] <schema> [<files...>]")
  .description("Validate file(s) with an Avram schema")
  .option(`-f, --format [name]     input format (${Object.keys(formats).join("|")})`)
  .option("-s, --schema            validate schema instead of record files")
  .option("-t, --type [types]      specify comma-separated record type(s)")
  .option("-p, --print             print all input records (in JSON)")
  .option("-v, --verbose           verbose error messages")
  .option("-l, --list              list supported validation options")
  .details(details)
  .action(avramAction)
  .parse(process.argv)
  .catch(e => {
    if (cli.options.verbose) {
      console.error(e)
    } else {
      console.error(`${e}`)
    }
    process.exit(1)
  })
