#!/usr/bin/env node
import cli from "../lib/cli.js"
import { formats, missing } from "../lib/formats.js"
import { optionHelp, optionDefault } from "../lib/options.js"
import { avramAction } from "../lib/action.js"

import ajv from "../lib/ajv.js"
var details = ajv ? "" : `
Install ajv and ajv-formats for better validation of schemas.`

if (missing.size) details += `
Install ${[...missing.keys()].join(", ")} for additional input formats.`

cli.usage("avram [options] [validation options] <schema> [<files...>]")
  .description("Validate file(s) with an Avram schema")
  .option(`-f, --format [name]     input format (${Object.keys(formats).join("|")})`)
  .option("-s, --schema            validate schema instead of record files")
  .option("-n, --novalid           don't validate schema before processing")
  .option("-d, --document [format] document schema (format=html)")
  .option("-t, --type [types]      specify comma-separated record types")
  .option("-x, --extension [name]  specify comma-separated extensions (e.g. marc)")
  .option("-p, --print             print all input records (in JSON)")
  .option("-v, --verbose           verbose error messages")
  .option("-l, --list              list supported validation options")
  .details(details)
  .action(async (args, opt) => {
    if (opt.list) {
      console.log("Validation options can be enable/disable by prepending +/-. The following")
      console.log("options (each with default status) are supported to report:\n")
      for (let option in optionDefault) {
        console.log(`${optionDefault[option] ? "+" : "-"}${option}`.padEnd(25)+optionHelp[option])
      }
    } else {
      process.exit(await avramAction(args, opt))
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
