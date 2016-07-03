/**
 * @file
 *
 * Config
 * The config
 */
const path = require('path')
const Immutable = require('immutable')
const {Observable: O} = require('rx')
const H = require('./helpers')

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

  applyDefaults: config =>
    Config.defaults(config).merge(config),

  /* Parses the config JSON */
  parse: location => configStr => {
    try {
      return Immutable.fromJS(
        Object.assign(JSON.parse(configStr), {location})
      )
    } catch (e) {
      throw new Error(`Failed to parse config file: ${location}`)
    }
  },

  readConfig: (configLocations = Config.locations) =>
    H.findExistingDirectory(configLocations)
      .catch(() => O.throw('No config file found! RTFM!'))
      .flatMap(location =>
        H.readFile(`${location}/${Config.filename}`)
          .map(Config.parse(location))
          .map(Config.applyDefaults)
      )
}

module.exports = Config

