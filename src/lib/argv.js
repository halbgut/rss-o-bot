const Immutable = require('immutable')

const Argv = {
  extractArguments: argv =>
    Immutable.fromJS({ action: argv[2], arguments: argv.slice(2) }),
  applyModeFlags: state => {
    const args = state.get('arguments')
    const modes = Immutable.List(['server', 'remote', 'local'])
    const newMode =
      args.filter(arg =>
        modes.includes(arg.substr(2))
      ).first() || state.get('mode')
    return (
      state
        .set('mode', newMode)
        .update('arguments', args =>
          args.filter(arg => !modes.includes(arg.substr(2)))
        )
    )
  }
}

module.exports = Argv

