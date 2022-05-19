import marcjson from "./lib/marcjson.js"
import Analyzer from "./lib/analyzer.js"
import { processRecords } from "./lib/recordstream.js"

async function analyze (sources, options) {
  const inspect = new Analyzer(options)
  Object.assign(options, { sources, action: rec => { inspect.add(rec) } })
  processRecords(options).then(() => inspect.schema())
}

export {
  marcjson,
  analyze,
  Analyzer,
}
