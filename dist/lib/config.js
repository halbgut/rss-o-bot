'use strict';

/**
 * Config
 * The config
 */
var path = require('path');
var Immutable = require('immutable');

var Config = {
  locations: [__dirname + '/../../data', process.platform === 'win32' ? process.env.USERPROFILE + '/.rss-o-bot' : process.env.HOME + '/.rss-o-bot'].map(function (l) {
    return path.normalize(l);
  }),

  filename: 'config.json',

  defaults: function defaults(config) {
    return Immutable.fromJS({
      mode: 'local',
      port: 3645,
      interval: 600,
      'jwt-expiration': 60,
      database: {
        name: 'rss-o-bot',
        options: {
          dialect: 'sqlite',
          storage: config.get('location') + '/feeds.sqlite'
        }
      }
    });
  },

  applyDefaults: function applyDefaults(state) {
    return state.set('configuration', state.get('configuration').merge(Config.defaults(state.get('configuration'))));
  },

  /* Parses the config JSON */
  parse: function parse(state, location) {
    return function (configStr) {
      try {
        return state.set('configuration', Immutable.fromJS(Object.assign(JSON.parse(configStr), { location: location })));
      } catch (e) {
        throw new Error('Failed to parse config file: ' + location);
      }
    };
  }
};

module.exports = Config;