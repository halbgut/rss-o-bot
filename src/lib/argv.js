const Immutable = require('immutable')

const Argv = {
  extractArguments: argv =>
    Immutable.fromJS({ action: argv[2], arguments: argv.slice(3) }),
  applyModeFlags: state => {
    const args = state.get('arguments')
    const modes = Immutable.List(['server', 'remote', 'local'])
    const newMode =
      args
        .filter(x => typeof x === 'string')
        .map(x => x.substr(2))
        .filter(arg =>
          typeof arg === 'string' &&
          modes.includes(arg)
        ).first() || state.get('mode')
    return (
      state
        .set('mode', newMode)
        .update('arguments', args =>
          args.filter(arg =>
            typeof arg !== 'string' ||
            !modes.includes(arg.substr(2))
          )
        )
    )
  }
}

module.exports = Argv

