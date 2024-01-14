#!/usr/bin/env node
import cli from "../lib/cli.js"
import formats from "../lib/formats.js"
import avramAction from "../lib/action.js"

cli.usage("avram [options] [validation options] <schema> [<files...>]")
  .description("Validate file(s) with an Avram schema")
  .option(`-f, --format [name]     input format (${Object.keys(formats).join("|")})`)
  .option("-s, --schema            validate schema instead of record files")
  .option("-t, --type [types]      specify comma-separated record type(s)")
  .option("-p, --print             print all input records (in JSON)")
  .option("-v, --verbose           verbose error messages")
  .option("-l, --list              list supported validation options")
  .details(`
An empty string schema argument uses the empty schema. Combining -n and -v
emits parsed records. See supported validation options with --list.`)
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
