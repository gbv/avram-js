# Changelog

All notable changes to this project will be documented in this file.

# 0.6.9 - 2025-02-17

- CLI: allow schema file to be documented from stdin

# 0.6.8 - 2024-12-13

- CLI: add option --split for CSV input

# 0.6.7 - 2024-06-06

- Extend HTML display
- Update JSON Schema
- Extend error objects
- CLI: add option --nullSequence
- Fix option undefinedCodelist

# 0.6.6 - 2024-01-19

- Allow pattern groups

# 0.6.5 - 2024-01-18

- CLI: emit schema errors in JSON
- Fix detection of unmatchable flags
- Add validation option invalidFlag

# 0.6.4 - 2024-01-17

- CLI: require argument to option -d
- Support validation of flags

# 0.6.3 - 2024-01-16

- CLI: start HTML export
- CLI: add option -n, --novalid to ignore schema errors
- Update JSON Schema to support deprecated codes

## 0.6.2 - 2024-01-15

- CLI: recommend additional installation on help
- Anticipate Avram 0.9.6
- Support detection of record types via extensions (experimental)

## 0.6.1 - 2024-01-14

- Support setting record type(s)
- Extend error messages
- Fix Avram version number

## 0.6.0 - 2024-01-13

- Update metaschema and validation rules to Avram 0.9.5
- Unify and rename CLI to 'avram'
- SchemaValidator: fix referencing positions with leading zeroes
- SchemaValidator: detect invalid code length

## 0.5.1 - 2024-01-03

- SchemaValidator: show error position

## 0.5.0 - 2024-01-02

- Update metaschema to Avram 0.9.4
- Extend validation of indicators

## 0.4.2 - 2024-01-02

- Meta-validator: check restrictions by format family
- CLI: show Avram specification number and result
- CLI: move and extend list of validation options

## 0.4.1 - 2023-12-22

- Update validation options to support all but externalRule
- Full update to Avram 0.9.3

## 0.4.0 - 2023-12-20

- Rename validation options
- Partial update to Avram 0.9.3
- Extend schema validator

## 0.3.2 - 2023-12-13

- extend schema validation
- support validation of indicators

## 0.3.1 - 2023-12-11

- add missing schema file

## 0.3.0 - 2023-12-11

- update to Avram 0.9.2, including validation error codes

## 0.2.0 - 2023-11-29

- remove support of deprecated elements (dropped from Avram specification)
- rename `Record` method `fromFlat` to `fromObject`
- rename `Record` method `fromMarc` to `fromMarcjs`
- rename `Record` method `fromPica` to `fromPicajson`
- add `SchemaValidator` and `avram-validate-schema` to validate Avram schemas
- rename `key` of record model to `tag`

## 0.1.1 - 2023-06-02

- update dependencies
- extend documentation

## 0.1.0 - 2022-06-22 (not released on npm)

- several breaking changes
- remove avram-analyze

## 0.0.4 - 2019 

- first prototype

