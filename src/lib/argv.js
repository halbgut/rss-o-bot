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
        const split = _switch.split('=')
        return (split.length === 1
          ? map.set(split[0], true)
          : map.set(split[0], split[1])
        )
      },
      Immutable.Map({})
    )
    return Immutable.fromJS({ action: argv[2], arguments: args, switches })
  },

  applyModeFlags: state => {
    const switches = state.get('switches')
    let mode
    if (switches.get('local')) {
      mode = 'local'
    } else if (switches.get('remote')) {
      mode = 'remote'
    } else if (switches.get('server')) {
      mode = 'server'
    }

    return mode ? state.set('mode', mode) : state
  }
}

module.exports = Argv

