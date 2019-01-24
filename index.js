const marcjson = require('./lib/marcjson')
const Analyzer = require('./lib/analyzer')
const { processRecords } = require('./lib/recordstream')

function analyze (sources, options) {
  return new Promise((resolve, reject) => {
    const inspect = new Analyzer(options)
    Object.assign(options, { sources, action: rec => { inspect.add(rec) } })
    processRecords(options).then(() => resolve(inspect.schema()))
  })
}

module.exports = {
  marcjson,
  analyze,
  Analyzer
}
