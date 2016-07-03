/**
 * Config
 * The config
 */
const path = require('path')
const Immutable = require('immutable')

const Config = {
  locations: [
    `${__dirname}/../../data`,
    process.platform === 'win32'
      ? `${process.env.USERPROFILE}/.rss-o-bot`
      : `${process.env.HOME}/.rss-o-bot`
  ].map(l => path.normalize(l)),

  filename: 'config.json',

  defaults: config => Immutable.fromJS({
    mode: 'local',
    port: 3645,
    interval: 600,
    'jwt-expiration': 60,
    database: {
      name: 'rss-o-bot',
      options: {
        dialect: 'sqlite',
        storage: `${config.get('location')}/feeds.sqlite`
      }
    }
  }),

  applyDefaults: state =>
    state.set(
      'configuration',
      Config.defaults(state.get('configuration')).merge(state.get('configuration'))
    ),

  /* Parses the config JSON */
  parse: (state, location) => configStr => {
    try {
      return state.set('configuration',
        Immutable.fromJS(
          Object.assign(JSON.parse(configStr), {location})
        )
      )
    } catch (e) {
      throw new Error(`Failed to parse config file: ${location}`)
    }
  }
}

module.exports = Config

