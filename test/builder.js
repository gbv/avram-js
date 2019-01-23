/* global describe it */
const { equal, deepEqual } = require('should')
const should = require('should')
const { Builder } = require('../index')

const fields = {
  '003@': {
    tag: '003@',
    required: true,
    subfields: {
      '0': { code: '0', required: true }
    }
  }
}

describe('Builder', () => {
  it('start with an empty schema', () => {
    let b = new Builder()
    deepEqual(b.schema(), { fields: {} })
    equal(b.count, 0)
  })

  it('builds a simple schema', () => {
    let b = new Builder()
    b.add([['003@', null, '0', '1234']])
    should.deepEqual(b.schema().fields, fields)
  })
})
