#!/usr/bin/env node
import cli from "../lib/cli.js"
import fs from "fs"
import { Marc } from "marcjs" // not listed as dependency!
// import picajs from "picajs" // TODO: pica

import { marcTransform } from "../lib/record.js"
import { Validator } from "../lib/validate.js"

const formats = {
  marcxml: {
    stream: input => Marc.stream(fs.createReadStream(input), "marcxml").pipe(marcTransform),
    pattern: /\.xml(\.gz)?$/,
  },
  iso2709: {
    stream: input => Marc.stream(fs.createReadStream(input), "iso2709").pipe(marcTransform),
    pattern: /\.mrc(\.gz)?$/,
  },
  // TODO: more formats (csv, tsv, pica...)
}

function getFormat(file, name) {
  if (name) {
    if (name in formats) {
      return formats[name]
    } else {
      throw new Error(`Unknown format '${name}'`)
    }
  }

  const format = Object.values(formats).filter(({pattern}) => file.match(pattern))[0]
  if (format) {
    return format
  } else {
    throw new Error("Please specify input format!")
  }
}

cli.usage("avram-validate [options] <schema> <files...>")
  .description("Validate file(s) with an Avram schema")
  .option("-f, --format [name]  input format")
  // TODO: support avram validation options
  .action(async (files, options) => {
    const schema = JSON.parse(fs.readFileSync(files.shift()))
    // TODO: validate schema
    const validator = new Validator(schema)
    // var ok = true

    // TODO: await end of all streams
    files.forEach(file => {
      const format = getFormat(file, options.format)
      const stream = format.stream(file)

      // see lib/recordstream.js (history)
      stream.on("data", record => {
        const errors = validator.validate(record)
        if (errors.length) {
          errors.forEach(e => console.error(e))
          // ok = false
        }
      })
    })
    //    process.exit(ok ? 0 : 2) 
  })
  .parse(process.argv)
  .catch(e => {
    console.error(e)
    console.error(`${e}`)
    process.exit(1)
  })
