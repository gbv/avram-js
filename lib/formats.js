import { Transform } from "stream"
import { Record } from "./record.js"

const recordTransform = (mapping, options) => new Transform({
  objectMode: true,
  transform(record, encoding, callback) {
    this.push(mapping(record, options))
    callback()
  },
})

export const formats = {}

//const marcStream = (input, format) => Marc.createStream(format, "Parser")
    
const picaPlugin = (module, format, pattern) => ({
  stream: (input, options) => module.parseStream(input, { format  })
    .pipe(recordTransform(Record.fromPicajson, options)),
  family: "pica", pattern,
})

const plugins = {
  marcjs: module => {
    formats.marcxml = {
      stream: (input, options) => 
        input.pipe(module.Marc.createStream("Marcxml", "Parser"))
          .pipe(recordTransform(Record.fromMarcjs, options)),
      pattern: /\.xml$/,
      family: "marc",
    }
    formats.iso2709 = {
      stream: (input, options) =>
        input.pipe(module.Marc.createStream("Iso2709", "Parser"))
          .pipe(recordTransform(Record.fromMarcjs, options)),
      pattern: /\.mrc$/,
      family: "marc",
    }
    formats.mrc = formats.iso2709
  },
  "pica-data": module => {
    formats.pp = picaPlugin(module, "plain", /\.(pp|plain)$/)
    formats.plain = formats.pp
    formats.normalized = picaPlugin(module, "normalized", /\.(norm)$/)
    formats.import = picaPlugin(module, "import", /\.(import)$/)
  },
  "csv-parser": module => {
    formats.csv = {
      stream(input, options) {        
        const splitValues = options.split === undefined ? record => record :
          (record, delimiter) => record.map(field => 
            field.value.split(delimiter).map(value => ({ tag: field.tag, value })), 
          ).flat()
        return input.pipe(module.default())
          .pipe(recordTransform(Record.fromObject,options))
          .pipe(recordTransform(splitValues,options.split))
      },
      pattern: /\.csv$/,
      family: "flat",        
    }
  },
  // TODO: add split2 to support, tsv... ndjson...
}

export const missing = new Set(Object.keys(plugins))

// dynamically load optional modules in parallel
const modules = Object.keys(plugins)
await Promise.allSettled(modules.map(m => import(m)))
  .then(imports => {
    imports.forEach(({value}, i) => {
      if (value) {
        const module = modules[i]
        plugins[module](value)
        missing.delete(module)
      }
    })
  })
