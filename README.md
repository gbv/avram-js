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
- [API]
  - [Validator](#validator)
  - [Record](#record)
  - [SchemaValidator](#schema-validator)
- [Test suite](#test-suite)
- [Related projects](#related-projects)
- [Maintainers](#maintainers)
- [Contributing](#contributing)
- [License](#license)

[Install]: #install
[API]: #api

## Background

Several schema languages exist for JSON (JSON Schema), XML (XSD, DTD, Schematron, RELAX NG), RDF (RDFS, SHACL, ShEx), and Strings (regular expressions and formal grammars). Avram is a schema language designed for field-based data formats such as MARC and PICA. Avram can also be used to define and validate flat key-value structures such as found in tabular data (CSV, TSV).

## Install

Requires Node >= 18.0.0 (possibly try [nvm](https://github.com/nvm-sh/nvm) to get a current version of Node). Installation of this module provides bare functionality for validating records, including the command line client [avram](#usage).

~~~sh
npm install -g avram
~~~

If 
To process selected data formats in serialization forms other than JSON, install additional parsing libraries [marcjs](https://www.npmjs.com/package/marcjs) for MARC, [pica-data](https://www.npmjs.com/package/marcjs) for PICA and [csv-parse](https://www.npmjs.com/package/csv-parse) for CSV:

~~~sh
npm install -g marcjs pica-data csv-parse
~~~

To also validate schema files, install additional libraries [ajv] and [ajv-formats]:

[ajv]: https://www.npmjs.com/package/ajv
[ajv-formats]: https://www.npmjs.com/package/ajv-formats

~~~sh
npm install -g ajv ajv-formats
~~~

To convert schema files to HTML, install additional library [ejs](https://ejs.co/):

~~~sh
npm install -g ejs
~~~

## Usage

See [API] for usage as programming library.

### avram

Validate records from input file(s) or standard input. The first argument
must be an Avram schema file. The list of supported input formats depends
on installed parsing libraries (see [Install]).

~~~
Usage: avram [options] [validation options] <schema> [<files...>]

Validate file(s) with an Avram schema

Options:
  -f, --format [name]     input format (marcxml|iso2709|mrc|pp|plain|csv)
  -s, --schema            validate schema instead of record files
  -d, --document          document schema in HTML (requires ejs)
  -t, --type [types]      specify comma-separated record types
  -x, --extension [name]  specify comma-separated extensions (e.g. marc)
  -p, --print             print all input records (in JSON)
  -v, --verbose           verbose error messages
  -l, --list              list supported validation options
  -h, --help              output usage information
  -V, --version           output the version number
~~~

Validation options can be enable/disable by prepending `+` or `-` respectively.
The following options (each with default status) are supported to report:

~~~
+invalidRecord           invalid records
+undefinedField          fields not found in the field schedule
+deprecatedField         report deprecated fields
+nonrepeatableField      repetition of non-repeatable fields
+missingField            required fields missing from a record
+invalidIndicator        field not matching expected validation definition
+invalidFieldValue       invalid flat field values
+invalidSubfield         invalid subfields (subsumes all subfield errors)
+undefinedSubfield       subfields not found in the subfield schedule
+deprecatedSubfield      report deprecated subfields
+nonrepeatableSubfield   repetition of non-repeatable subfields
+missingSubfield         required subfields missing from a field
+invalidSubfieldValue    invalid subfield values
+patternMismatch         values not matching an expected pattern
+invalidPosition         values not matching expected positions
+recordTypes             support record types
+invalidFlag             value is not a concatenation of flags
+undefinedCode           values not found in an expected codelist
-undefinedCodelist       non-resolveable codelist references
-countRecord             expected number of records not met
-countField              expected number of fields not met
-countSubfield           expected number of subfields not met
~~~

Proper validation of schemas requires additional libraries [ajv] and [ajv-formats] to be installed.

The JSON format emitted with option `-p` or `--print` looks like this:

~~~json
{
  "fields": [
    { "key": "tag1", "value": "..." },
    { "key": "tag2", "value": "..." }
  ],
  "types": []
}
~~~

It can be converted to flat key-value structure by piping to
[jq](https://jqlang.github.io/jq/) command `jq '.fields|from_entries'`.

## API

### Validator

Class `Validator` implements validation against an Avram schema.

~~~js
import { Validator } from "avram"

const validator = new Validator(schema, options)

// validate a set of records
const errors = validator.validateRecords(records)
if (!errors.length) {
  console.log("valid")
} else {
  errors.forEach(e => console.error(e))
}

// validate a single record
errors = validator.validate(record)
~~~

The record structure expected by `validate`, based on the [Avram record model](https://format.gbv.de/schema/avram/specification#records), is a JSON object with optional array `types` and required array `fields`, each a JSON object with the following keys:

- mandatory `tag` (string), the key of a field
- either `value` (string), the flat field value, or `subfields` (array with alternating subfield codes and subfield values)
- optional `occurrence` (string) or `indicators` (array of two strings)

Method `validate` always returns a (hopefully empty) array of errors. Each error is a JSON object with these keys (all optional except `message`):

- human readable error `message`
- `error` with the number of the violated rule from Avram specification (e.g. `"AR1"`)
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

Class `SchemaValidator` implements validation of an Avram schema (Avram schema meta-validator). Full validation requires additional libraries [ajv] and [ajv-formats] to be installed.

~~~js
import { SchemaValidator } from "avram"

const validator = new SchemaValidator()
const errors = validator.validate(schema)
if (errors.length) {
  errors.forEach(e => console.error(e))
}
~~~

## Test suites

This package contains the official test suite for Avram validators. See directory `test/suite/` and its file `README.md` for details.

The unit tests of this library further contain a test suite of valid and invalid Avram schemas in file `test/schema-suite.json`.

## Related projects

[QA Catalogue](https://github.com/pkiraly/qa-catalogue) implements validation of MARC 21, UNIMARC and K10plus PICA, partly based on Avram Schemas.

Perl modules [MARC::Schema](https://metacpan.org/pod/MARC::Schema) and [PICA::Schema](https://metacpan.org/pod/PICA::Schema) partially implement Avram as well.

Several libraries and tools exist to validate MARC data: [@natlibfi/marc-record-validate](https://www.npmjs.com/package/@natlibfi/marc-record-validate), [@russian-state-library/js-marc-rsl](https://www.npmjs.com/package/@russian-state-library/js-marc-rsl) (Node), [MARCEdit](https://marcedit.reeset.net/).

## Maintainers

- [@nichtich](https://github.com/nichtich) (Jakob Voß)

## Contributing

Contributions are welcome! Best use [the issue tracker](https://github.com/gbv/avram-js/issues) for questions, bug reports, and/or feature requests!

## License

MIT license
