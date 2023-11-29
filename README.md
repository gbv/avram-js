# avram-js

> Avram Schema Language implementation in JavaScript

[![Test](https://github.com/gbv/avram-js/actions/workflows/test.yml/badge.svg?branch=dev)](https://github.com/gbv/avram-js/actions/workflows/test.yml)
[![NPM Version](http://img.shields.io/npm/v/avram.svg?style=flat)](https://www.npmjs.org/package/avram)
[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg)](https://github.com/RichardLitt/standard-readme)

This Node package implements [Avram Schema Language](http://format.gbv.de/schema/avram/specification) to validate field-based data formats, in particular library data formats such as MARC and PICA.

## Table of Contents

- [Background](#background)
- [Install]
- [Usage](#usage)
  - [avram-validate]
  - [avram-validate-schema](#avram-validate-schema)
- [API]
  - [Validator](#validator)
  - [Record](#record)
  - [SchemaValidator](#schema-validator)
- [Test suite](#test-suite)
- [Maintainers](#maintainers)
- [Contributing](#contributing)
- [License](#license)

[Install]: #install
[avram-validate]: #avram-validate
[API]: #api

## Background

Several schema languages exist for JSON (JSON Schema), XML (XSD, DTD, Schematron, RELAX NG), RDF (RDFS, SHACL, ShEx), and Strings (regular expressions and formal grammars). Avram is a schema language designed for field-based data formats such as MARC and PICA. Avram can also be used to define and validate flat key-value structures.

See also Perl modules [MARC::Schema](https://metacpan.org/pod/MARC::Schema) and [PICA::Schema](https://metacpan.org/pod/PICA::Schema) partially implementing Avram.

## Install

Requires Node >= 18.0.0. Installation of this module provides bare functionality for validating records, including the command line client [avram-validate]:

~~~sh
npm install avram
~~~

To process selected data formats in serialization forms other than JSON, install additional parsing libraries [marcjs](https://www.npmjs.com/package/marcjs) for MARC, [pica-data](https://www.npmjs.com/package/marcjs) for PICA and [csv-parse](https://www.npmjs.com/package/csv-parse) for CSV:

~~~sh
npm install marcjs  
npm install pica-data
npm install csv-parse
~~~

To also validate schema files, install additional libraries [ajv] and [ajv-formats]:

[ajv]: https://www.npmjs.com/package/ajv
[ajv-formats]: https://www.npmjs.com/package/ajv-formats

~~~sh
npm install ajv ajv-formats
~~~

## Usage

See [API] for usage as programming library.

### avram-validate

~~~
Usage: avram-validate [options] <schema> [<files...>]

Validate file(s) with an Avram schema

Options:
  -f, --format [name]      input format (marcxml|iso2709|mrc|pp|plain|csv)
  -v, --verbose            verbose error messages
  -n, --no-validate        only parse schema and records.
  -o, --options [options]  set validation options.
  -h, --help               output usage information
  -V, --version            output the version number

An empty string schema argument uses the empty schema. Combining -n and -v emits
parsed records. Validation options (separable with any of [ ,|+]):

  ignore_unknown_fields
  ignore_subfields
  ignore_unknown_subfields
  ignore_values
  ignore_codes
  ignore_unknown_codelists
~~~

The list of supported input formats depends on installed parsing libraries (see [Install]).

### avram-validate

Requires additional libraries [ajv] and [ajv-formats] to be installed.

~~~
Usage: avram-validate-schema [options] <schema>

Validate Avram schema file against Avram specification

Options:
  -v, --verbose  verbose error messages
  -h, --help     output usage information
  -V, --version  output the version number
~~~

## API

### Validator

Class `Validator` implements validation against an Avram schema.

~~~js
import { Validator } from "avram"

const validator = new Validator(schema, options)
const errors = validator.validate(record)
if (!errors.length) {
  console.log("valid")
} else {
  errors.forEach(e => console.error(e))
}
~~~

The record structure expected by `validate`, based on the [Avram record model](https://format.gbv.de/schema/avram/specification#records), is array of fields, each a JSON object with the following keys:

- mandatory `tag` (string), the key of a field
- either `value` (string), the flat field value, or `subfields` (array with alternating subfield codes and subfield values)
- optional `occurrence` (string) or `indicators` (array of two strings)

Method `validate` always returns a (hopefully empty) array of errors. Each error is a JSON object with these keys (all optional except `message`):

- human readable error `message`
- `tag` or `tag` and `occurence` of an invalid field
- `identifier` of an invalid field
- `code` of an invalid subfield
- `value` of an invalid (sub)field 
- `pattern` of an invalid (sub)field

### Record

The `Record` object provides methods to convert usual formats to Avram record format:

~~~js
import { Record } from "avram"

var record = Record.fromObject(obj)    // any key-value object. Non-flat values are ignored.
var record = Record.fromMarcjs(marc)   // expect marcjs record structure
var record = Record.fromPicajson(pica) // expect PICA/JSON record stucture
~~~

See [marcjs records](https://github.com/fredericd/marcjs#record-class) and [PICA/JSON](http://format.gbv.de/pica/json) for reference.

### SchemaValidator

Class `SchemaValidator` implements validation of an Avram schema. Full validation requires additional library [ajv] to be installed.

~~~js
import { SchemaValidator } from "avram"

const validator = new SchemaValidator()
const errors = validator.validate(schema)
if (errors.length) {
  errors.forEach(e => console.error(e))
}
~~~

## Test suite

This package contains the official test suite for Avram validators. See directory `test/suite/` and its file `README.md` for details.

## Maintainers

- [@nichtich](https://github.com/nichtich) (Jakob Voß)

## Contributing

Contributions are welcome! Best use [the issue tracker](https://github.com/gbv/avram-js/issues) for questions, bug reports, and/or feature requests!

## License

MIT license
