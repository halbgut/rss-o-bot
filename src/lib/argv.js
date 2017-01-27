const Immutable = require('immutable')

const Argv = {
  extractArguments: argv => {
    const [args, rawSwitches] = argv.slice(3)
      .reduce(
        ([ args, switches ], arg) =>
          typeof arg === 'string' && arg.substr(0, 2) === '--'
            ? [ args, switches.concat(arg.substr(2)) ]
            : [ args.concat(arg), switches ],
        [[], []]
      )
    const switches = rawSwitches.reduce(
      (map, _switch) => {
        const [ key, rawValue = '' ] = _switch.split('=')
        const splitValue = rawValue.split(',')
        const value = splitValue.length > 1
          ? splitValue
          : splitValue[0] || true
        return map.set(key, value)
      },
      Immutable.Map({})
    )
    return Immutable.fromJS({ action: argv[2] || 'run', arguments: args, switches })
  }
}

module.exports = Argv

