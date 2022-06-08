#!/usr/bin/env node
import cli from "../lib/cli.js"
import fs from "fs"
import { Marc } from "marcjs" // not listed as dependency!
import { parsePicaLine } from "pica-data" // not listed as dependency!

import { marcTransform, picaTransform } from "../lib/record.js"
import { Validator } from "../lib/validate.js"
// TODO: move to picadata

import { Readable } from "stream"
import readline from "readline"

const Pica = {
  stream: input => {
    const stream = new Readable({ objectMode: true, read () {} })
    var record = []
    const nextRecord = () => {
      if (record.length) {
        stream.push(record)
        record = []
      }
    }
    readline.createInterface(input) // TODO: use transformer instead?
      .on("line", line => {
        if (line === "") {
          nextRecord()
        } else {
          const field = parsePicaLine(line)
          if (field) {
            record.push(field)
          } else {
            const error = new Error(`Malformed PICA+ Plain: '${line}'`)
            stream.destroy(error)
          }
        }
      })
      .on("close", () => {
        nextRecord()
        stream.push(null)
      })
      .on("error", e => {
        console.error(e)
      })
    return stream
  },
}

const formats = {
  marcxml: {
    stream: input => Marc.stream(input, "marcxml").pipe(marcTransform),
    pattern: /\.xml$/,
    family: "marc",
  },
  iso2709: {
    stream: input => Marc.stream(input, "iso2709").pipe(marcTransform),
    pattern: /\.mrc$/,
    family: "marc",
  },
  pp: {
    stream: input => Pica.stream(input, "plain").pipe(picaTransform),
    pattern: /\.(pp|plain)$/,
    family: "pica",
  },
  // TODO: more formats (marcjson, picajson, csv, tsv, normalized pica...)
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

cli.usage("avram-validate [options] <schema> [<files...>]")
  .description("Validate file(s) with an Avram schema")
  .option("-f, --format [name]  input format")
  .option("-v, --verbose        verbose output")
  // TODO: support avram validation options
  .action(async (files, options) => {    
    const schema = JSON.parse(fs.readFileSync(files.shift()))
    // TODO: validate schema
    const validator = new Validator(schema)
    var ok = true

    if (!files.length) {
      files = ["-"]
    }

    // this validates parallel
    await Promise.all(files.map(file => new Promise((resolve, reject) => {
      const format = getFormat(file, options.format)
      const input = file === "-" ? process.stdin : fs.createReadStream(file)
      const stream = format.stream(input)

      stream.on("data", record => {
        const errors = validator.validate(record)
        errors.forEach(e => {
          if (file !== "-") {
            e.file = file
          }
          if (options.verbose) {
            console.error(JSON.stringify(e))
          } else {
            console.error(e.message)
          }
          ok = false
        })
      })
      stream.on("end", resolve)
      stream.on("error", reject)
    }))) // TODO: catch errors

    process.exit(ok ? 0 : 2) 
  })
  .parse(process.argv)
  .catch(e => {
    console.error(`${e}`)
    process.exit(1)
  })
