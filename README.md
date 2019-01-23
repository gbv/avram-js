# avram-js

> Avram Schema Language implementation in JavaScript

[![Build Status](https://travis-ci.com/gbv/avram-js.svg?branch=master)](https://travis-ci.com/gbv/avram-js)
[![NPM Version](http://img.shields.io/npm/v/avram.svg?style=flat)](https://www.npmjs.org/package/avram)
[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg)](https://github.com/RichardLitt/standard-readme)

This Node package implements [Avram Schema Language] to analyze and validate
library data formats such as MARC, PICA, MAB, and allegro.

*experimental*

## Table of Contents

* [Install](#install)
* [Usage](#usage)
* [API](#api)
  * [marcjson](#marcjson)
  * [Builder](#builder)

## Install

```bash
npm install -g avram
```

## Usage

This package does not include or enforce a MARC parsing library, such as
[marcjs](https://www.npmjs.com/package/marcjs).

See `examples/` for examples.

## API

~~~js
const { Builder, marcjson } = require('avram')
~~~

### marcjson

This utility function can be used to normalize one record from different
variants of parsed JSON serializations (MARC in JSON, Javascript MARC record
representation, MARC JSON...) into an array of fields such as the following:

~~~json
[
  ["LDR", null, null, "_", "01471cjm a2200349 a 4500"], 
  ["001", null, null, "_", "5674874"], 
  ["035", " ", " ", "9", "(DLC)   93707283"]
]
~~~

### Builder

Builds an Avram schema based on a set of existing records.

## Maintainers

- [@nichtich](https://github.com/nichtich)

## Contributing

Contributions are welcome! Best use [the issue tracker](https://github.com/gbv/avram-js/issues)
for questions, bug reports, and/or feature requests!

## License

MIT license

[Avram Schema Language]: http://format.gbv.de/schema/avram/specification
