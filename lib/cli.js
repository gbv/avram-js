/**
 * Simple clone of <https://www.npmjs.com/package/commander>
 */

class Options {
  constructor () {
    this.optionSpec = {}
    this.optionLookup = {}
  }

  option (option) {
    const [show, letter, name, value, info] =
        option.match(/^(-(\w), --(\w[\w-]*)( [^ ]+)?)\s+(.+)$/).slice(1)
    const spec = { letter, name, value, info }
    this.optionSpec[show] = spec
    this.optionLookup[letter] = spec
    this.optionLookup[name] = spec
    return this
  }

  showOptions () {
    const spec = this.optionSpec
    const keys = Object.keys(spec)
    const space = new Array(Math.max(...keys.map(s => s.length)) + 3).join(" ")

    console.log("Options (negate with uppercase letter or '--no-...'):")
    console.log(
      keys.map(key => "  " + (key + space).substr(0, space.length) + spec[key].info)
        .join("\n"),
    )
  }

  parseOptions (args) {
    args = [...args]
    const opts = {}
    const params = []

    while (args.length) {
      const arg = args.shift()
      if (arg === "--") break

      // TODO: combine letters
      const match = arg.match(/^(-\w|--\w[\w-]*)$/)
      if (match) {
        let name = arg.replace(/^-+/, "")
        let value = true

        if (name.match(/^no-/)) {
          name = name.substr(3)
          value = false
        }

        let spec = this.optionLookup[name]
        if (!spec && this.optionLookup[name.toLowerCase()]) {
          name = name.toLowerCase()
          spec = this.optionLookup[name]
          value = false
        }
        if (spec) {
          name = spec.name
          if (spec.value && args.length) {
            value = args.shift()
          }
        }

        opts[name] = value
      } else {
        params.push(arg)
      }
    }

    return { opts, params: [...params, ...args] }
  }
}

class CLI extends Options {
  constructor () {
    super()
    this.cfg = {}
    this.optMap = {}
  }

  usage (s) { this.cfg.usage = s; return this }

  description (s) { this.cfg.description = s; return this }

  action (f) { this.cfg.action = f; return this }

  help () {
    const { usage, description } = this.cfg
    console.log(`Usage: ${usage}

${description}
`)
    this.showOptions()
    process.exit()
  }

  version () {
    process.exit()
  }

  parse (argv) {
    this.option("-h, --help     output usage information")
    this.option("-V, --version  output the version number")

    const args = argv.slice(2)
    const { opts, params } = this.parseOptions(args)
    if (!args.length) opts.help = true

    if (opts.help) {
      this.help()
    } else if (opts.version) {
      const { version, avram } = require("../package.json")
      console.log(`avram ${version} (based on Avram Specification ${avram})`)
      process.exit()
    }

    this.cfg.action(params, opts)
  }
}

export default new CLI()
