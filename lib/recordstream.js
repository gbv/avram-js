/**
 * Provide a stream of MARC records from diverse sources.
 */
const fs = require('fs')

/**
 * Wraps require('marcjs') to provide hint if package is missing.
 */
function marcjs (input, format) {
  try {
    return require('marcjs').stream(input, format)
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
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
  marcxml: input => marcjs(input, 'marcxml'),
  iso2709: input => marcjs(input, 'iso2709'),
  ndjson: input => {
    const readline = require('readline')
    const { Transform } = require('stream')

    const stream = Transform({
      objectMode: true,
      transform (chunk, encoding, proc) {
        proc(false, chunk)
      }
    })

    readline.createInterface(input)
      .on('line', line => stream.write(JSON.parse(line)))
      .on('close', () => stream.emit('end'))

    return stream
  }
}

/**
 * Get an object stream of records from a file or STDIN.
 */
function recordStream (file = '-', format) {
  if (!format) {
    if (file.match(/\.xml(\.gz)?$/)) {
      format = 'marcxml'
    } else if (file.match(/\.mrc(\.gz)?$/)) {
      format = 'iso2709'
    } else if (file.match(/\.ndjson/)) {
      format = 'ndjson'
    } else {
      format = 'ndjson' // default
    }
  }

  const input = file === '-' ? process.stdin : fs.createReadStream(file)

  if (format in readers) {
    return readers[format](input)
  } else {
    throw new Error(`Unknown format: ${format}`)
  }
}

/**
 * Process a list of record sources one after another.
 */
function processRecords (action, sources) {
  return new Promise((resolve, reject) => {
    var waiting = sources.length
    if (!waiting) resolve()

    const streams = sources.map(s => recordStream(s))

    streams.forEach(stream => {
      stream.on('data', action)
      stream.on('end', () => {
        if (--waiting === 0) {
          resolve()
        }
      })
    })
  })
}

module.exports = { recordStream, processRecords }
