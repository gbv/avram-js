# avram-js

> Avram Schema Language implementation in JavaScript

[![Build Status](https://travis-ci.com/gbv/avram-js.svg?branch=master)](https://travis-ci.com/gbv/avram-js)
[![NPM Version](http://img.shields.io/npm/v/avram.svg?style=flat)](https://www.npmjs.org/package/avram)
[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg)](https://github.com/RichardLitt/standard-readme)

This Node package implements [Avram Schema Language] to analyze and validate
library data formats such as MARC, PICA, MAB, and allegro.

*The current version of only supports creation of schema but no validation yet!*

## Table of Contents

* [Background](#background)
* [Install](#install)
* [Usage](#usage)
  * [avram-analyze](#avram-analyze)
  * [marc-json](#marc-json)
  * [In the browser](#in-the-browser)
* [API](#api)
  * [analyze]
  * [Analyzer]
  * [marcjson](#marcjson)

[analyze]: #analyzefiles-options
[Analyzer]: #analyzeroptions

## Background

See also Perl modules [MARC::Schema](https://metacpan.org/pod/MARC::Schema) and
[PICA::Schema](https://metacpan.org/pod/PICA::Schema).

## Install

~~~sh
npm install -g avram
~~~

To handle MARC files other than JSON serializations (e.g. MARCXML) you als need
to install MARC parsing library [marcjs](https://www.npmjs.com/package/marcjs):

~~~sh
npm install -g marcjs
~~~

Avram Schema files can get quite large. For more readable JSON output optionally install
[json-stringify-pretty-compact](https://www.npmjs.com/package/json-stringify-pretty-compact):

~~~sh
npm install -g json-stringify-pretty-compact
~~~

## Usage

### avram-analyze
 
Command line client to build an Avram schema from existing record files.

~~~
Usage: avram-analyze [opts] files...

Parse MARC or PICA record files and create a basic Avram Schema.

Options (negate with uppercase letter or '--no-...'):
  -s, --subfields   include subfields (default)
  -i, --indicators  include indicators (default)
  -p, --positions   include positions (default)
  -h, --help        output usage information
  -V, --version     output the version number
~~~

### marc-json

Utility command line client to normalize MARC or related format files to JSON.

~~~
Usage: marc-json [options] files...

Parse MARC or related format files and convert records to JSON

Options (negate with uppercase letter or '--no-...'):
  -f, --format [name]  specify input format (json|ndjson)
  -t, --to [name]      specify output format (json|ndjson)
  -h, --help           output usage information
  -V, --version        output the version number
~~~

### analyze(files, options)

Read a list of record files and promise an Avram schema:

~~~js
analyze(['records.mrc', 'more-records.ndjson', 'even-more-records.xml.gz'])
.then( schema => { console.log(schema) } )
~~~

The following optional options are supported:

* `subfields` to include subfields (default `true`)
* `positions` to include positions (default `true`) 
* `indicators` to include indicators (default `true`)

### Analyzer(options)

Internally used by function [analyze] to synchronously build an Avram schema
from a set of existing records:

~~~js
const inspect = new Analyzer()
records.forEach(r => inspect.add(r))
var schema = inspect.schema()
var count  = inspect.count
~~~

Supports the same options as [analyze].

### marcjson

Normalize a record from different variants of parsed JSON serializations (MARC
in JSON, Javascript MARC record representation...) into [MARC JSON] format:

~~~json
[
  ["LDR", null, null, "_", "01471cjm a2200349 a 4500"], 
  ["001", null, null, "_", "5674874"], 
  ["035", " ", " ", "9", "(DLC)   93707283"]
]
~~~

## Maintainers

- [@nichtich](https://github.com/nichtich) (Jakob Voß)

## Contributing

Contributions are welcome! Best use [the issue tracker](https://github.com/gbv/avram-js/issues)
for questions, bug reports, and/or feature requests!

## License

MIT license

[Avram Schema Language]: http://format.gbv.de/schema/avram/specification
[MARC JSON]: http://format.gbv.de/marc/json
