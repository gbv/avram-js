import { marcTransform, picaTransform, flatTransform } from "./record.js"

const formats = {}

const plugins = {
  marcjs: module => {
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
  },
  "pica-data": module => {
    formats.pp = {
      stream: input => module.parseStream(input, { format: "plain" }).pipe(picaTransform),
      pattern: /\.(pp|plain)$/,
      family: "pica",
    }
    formats.plain = formats.pp
    // TODO: add normalized pica
  },
  "csv-parser": module => {
    formats.csv = {
      stream: input => input.pipe(module.default({
        // filter out empty string column
        mapHeaders: ({header}) => header != "" ? header : null,
      })).pipe(flatTransform),
      pattern: /\.csv$/,
      family: "flat",        
    }
  },
  // TODO: add split2 to support, tsv... ndjson...
}

// dynamically load optional modules in parallel
const modules = Object.keys(plugins)
await Promise.allSettled(modules.map(m => import(m)))
  .then(imports => {
    imports.forEach(({value}, i) => {
      if (value) {
        plugins[modules[i]](value)
      }
    })
  })

export default formats
