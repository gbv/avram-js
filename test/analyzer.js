/* global describe it */
const { equal, deepEqual } = require('should')
const should = require('should')
const { Analyzer } = require('../index')

const fields = {
  '003@': {
    tag: '003@',
    required: true,
    subfields: {
      '0': { code: '0', required: true }
    }
  }
}

describe('Analyzer', () => {
  it('start with an empty schema', () => {
    let b = new Analyzer()
    deepEqual(b.schema(), { fields: {} })
    equal(b.count, 0)
  })

  it('builds a simple schema', () => {
    let b = new Analyzer({ positions: false })
    b.add([['003@', null, '0', '1234']])
    should.deepEqual(b.schema(), {
      fields,
      description: 'Based on analyzing 1 record'
    })
  })

  it('builds a complex schema', () => {
    let inspect = new Analyzer()
    inspect.add(require('./files/sandburg.json')[0])
    should.deepEqual(inspect.schema(), require('./schemas/sandburg.json'))
  })
})
