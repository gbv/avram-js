/**
 * Stringify JSON, use pretty compact format if possible.
 */
let { stringify } = JSON
try { stringify = require('json-stringify-pretty-compact') } catch (e) { }

module.exports = stringify
