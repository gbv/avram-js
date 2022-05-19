/**
 * Provide a stream of MARC records from diverse sources.
 */

import fs from "fs"
import { Readable } from "stream"

/**
 * Wraps require('marcjs') to provide hint if package is missing.
 */
function marcjs (input, format) {
  try {
    return require("marcjs").stream(input, format)
  } catch (e) {
    if (e.code !== "MODULE_NOT_FOUND") {
      throw e
    }
    throw new Error(`Package marcjs required to parse ${format} format.
Try to install via: npm install -g marcjs`)
  }
}

/**
 * Known input formats.
 */
const readers = {

  marcxml: input => marcjs(input, "marcxml"),

  iso2709: input => marcjs(input, "iso2709"),

  ndjson: input => {
    const stream = new Readable({ objectMode: true, read () {} })
    require("readline").createInterface(input)
      .on("line", line => stream.push(JSON.parse(line)))
      .on("close", () => stream.push(null))
    return stream
  },

  json: input => {
    var json = []
    const stream = new Readable({ objectMode: true, read () {} })
    input
      .on("data", data => json.push(data))
      .on("close", () => {
        json = JSON.parse(json.join(""))
        json.forEach(rec => stream.push(rec))
        stream.push(null)
      })
    return stream
  },

  // TODO: normpp (0A, 1E, 1F), pp, picamarc, extpp, picaxml
}

/**
 * Get an object stream of records from a file or STDIN.
 */
function recordStream (file = "-", format) {
  if (!format) {
    if (file.match(/\.xml(\.gz)?$/)) {
      format = "marcxml"
    } else if (file.match(/\.mrc(\.gz)?$/)) {
      format = "iso2709"
    } else if (file.match(/\.ndjson$/)) {
      format = "ndjson"
    } else if (file.match(/\.json$/)) {
      format = "json"
    } else {
      format = "ndjson" // default
    }
  }

  const input = file === "-" ? process.stdin : fs.createReadStream(file)

  if (format in readers) {
    return readers[format](input)
  } else {
    throw new Error(`Unknown format: ${format}`)
  }
}

/**
 * Process a list of record sources one after another.
 */
async function processRecords (config) {
  const { action, sources } = config

  var waiting = sources.length
  if (!waiting) return

  const streams = sources.map(s => recordStream(s))

  streams.forEach(stream => {
    stream.on("data", action)
    stream.on("end", () => {
      if (--waiting === 0) {
        return
      }
    })
  })
}

export { recordStream, processRecords }
