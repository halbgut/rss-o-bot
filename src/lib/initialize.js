const { Observable: O } = require('rxjs/Rx')
const Immutable = require('immutable')

const Argv = require('./argv')
const Config = require('./config')

module.exports = (argv, configLocations = Config.locations, config) =>
  O.of(argv)
    /* Extract arguments */
    .map(Argv.extractArguments)
    /* Get config */
    .switchMap(state =>
      (config
        ? O.of(Immutable.fromJS(config)).map(Config.applyDefaults)
        : Config.readConfig(state.getIn(['switches', 'config']) || configLocations)
      )
        .map(Config.applyOverrides(state.get('switches')))
        .map(c => state.set('configuration', c))
    )
    /* Define mode */
    .map(state =>
      state.set(
        'mode',
        state.getIn(['configuration', 'remote'])
          ? 'remote'
          : state.getIn(['configuration', 'mode'])
      )
    )
