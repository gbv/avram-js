#!/usr/bin/env node
import cli from "../lib/cli.js"
import fs from "fs"

import { marcTransform, picaTransform } from "../lib/record.js"
import { Validator } from "../lib/validate.js"

const formats = {}
// TODO: more formats (marcjson, picajson, csv, tsv, normalized pica...)

const enableMarc = module => {
  if (module) {
    formats.marcxml = {
      stream: input => module.Marc.stream(input, "marcxml").pipe(marcTransform),
      pattern: /\.xml$/,
      family: "marc",
    }
    formats.iso2709 = {
      stream: input => module.Marc.stream(input, "iso2709").pipe(marcTransform),
      pattern: /\.mrc$/,
      family: "marc",
    }
    formats.mrc = formats.iso2709
  }
}

const enablePica = pica => {
  if (pica) {
    formats.pp = {
      stream: input => pica.parseStream(input, { format: "plain" }).pipe(picaTransform),
      pattern: /\.(pp|plain)$/,
      family: "pica",
    }
    formats.plain = formats.pica
  }
}

// dynamically and parallely load optional modules
await Promise.allSettled([import("marcjs"),import("pica-data")])
  .then(imports => {
    enableMarc(imports[0].value)
    enablePica(imports[1].value)
  })


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

function readSchema(file) { // TODO: check family
  const schema = JSON.parse(fs.readFileSync(file))
  // TODO: validate schema
  return schema
}

cli.usage("avram-validate [options] <schema> [<files...>]")
  .description("Validate file(s) with an Avram schema")
  .option(`-f, --format [name]  input format (${Object.keys(formats).join("|")})`)
  .option("-v, --verbose        verbose output")
  // TODO: support avram validation options
  .action(async (files, options) => {    
    const schema = readSchema(files.shift())
    const validator = new Validator(schema)
    var ok = true

    if (!files.length) {
      files = ["-"]
    }

    // validate parallel
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
      stream.on("error", reject)
      stream.on("end", resolve)
    }))) // TODO: catch errors?

    process.exit(ok ? 0 : 2) 
  })
  .parse(process.argv)
  .catch(e => {
    // console.error(e)
    console.error(`${e}`)
    process.exit(1)
  })
