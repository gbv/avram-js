# avram-js

> Avram Schema Language implementation in JavaScript

[![Test](https://github.com/gbv/avram-js/actions/workflows/test.yml/badge.svg?branch=dev)](https://github.com/gbv/avram-js/actions/workflows/test.yml)
[![NPM Version](http://img.shields.io/npm/v/avram.svg?style=flat)](https://www.npmjs.org/package/avram)
[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg)](https://github.com/RichardLitt/standard-readme)

This Node package implements [Avram Schema Language](http://format.gbv.de/schema/avram/specification) to validate field-based data formats, in particular library data formats such as MARC and PICA.

## Table of Contents

* [Background](#background)
* [Install]
* [Usage](#usage)
  * [avram-validate]
* [API]
* [Maintainers](#maintainers)
* [Contributing](#contributing)
* [License](#license)

[Install]: #install
[avram-validate]: #avram-validate
[API]: #api

## Background

See also Perl modules [MARC::Schema](https://metacpan.org/pod/MARC::Schema) and
[PICA::Schema](https://metacpan.org/pod/PICA::Schema).

## Install

Requires Node >= 14.8.0. Installation of this module provides bare functionality for validating records, including the command line client [avram-validate]:

~~~sh
npm install avram
~~~

To process selected data formats in serialization forms other than JSON, install additional parsing libraries [marcjs](https://www.npmjs.com/package/marcjs) for MARC, [pica-data](https://www.npmjs.com/package/marcjs) for PICA and [csv-parse](https://www.npmjs.com/package/csv-parse) for CSV:

~~~sh
npm install marcjs  
npm install pica-data
npm install csv-parse
~~~

Avram Schema files can get quite large. For more readable JSON output optionally install
[json-stringify-pretty-compact](https://www.npmjs.com/package/json-stringify-pretty-compact):

~~~sh
npm install json-stringify-pretty-compact
~~~

## Usage

See [API] for usage as programming library.

### avram-validate

~~~
Usage: avram-validate [options] <schema> [<files...>]

Validate file(s) with an Avram schema

Options:
  -f, --format [name]  input format
  -v, --verbose        verbose output
  -h, --help           output usage information
  -V, --version        output the version number
~~~

The list of supported input formats depends on installed parsing libraries (see [Install]).

## API

~~~js
TODO
~~~

## Maintainers

- [@nichtich](https://github.com/nichtich) (Jakob Voß)

## Contributing

Contributions are welcome! Best use [the issue tracker](https://github.com/gbv/avram-js/issues) for questions, bug reports, and/or feature requests!

## License

MIT license
