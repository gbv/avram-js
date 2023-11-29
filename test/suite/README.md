# Avram Test Suite

This directory contains a set of JSON files with examples of Avram schemas, records and expected validation results that Avram validation libraries can use to test their validators.

## Structue of a test

The tests in this suite are grouped in `.json` files. Each file contains an array of objects with keys:

* `schema` an Avram schema,
* `tests` an array of tests, and
* `description` an optional description of all tests in this file, given as string.
* `options` an optional array of validation options, each given as string. 

Each test is an object with keys:

* `record` a record, given as array of fields, each with keys

  * `tag`
  * `indicators` (optional)
  * `occurrence`(optional)
  * either `value` or `subfields`

* `errors` an array of expected errors. If no errors are given, the validation is expected to pass.

* `options` an optional array of validation options, each given as string. The values are added to options given for the full test file, of available.
