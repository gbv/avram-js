const marcjson = require('./lib/marcjson')
const Analyzer = require('./lib/analyzer')
const { processRecords } = require('./lib/recordstream')

function analyze (sources) {
  return new Promise((resolve, reject) => {
    const inspect = new Analyzer()
    processRecords(rec => { inspect.add(rec) }, sources)
      .then(() => resolve(inspect.schema()))
  })
}

module.exports = {
  marcjson,
  analyze,
  Analyzer
}
