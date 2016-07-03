'use strict';

/**
 * @file
 *
 * Config
 * The config
 */
var path = require('path');
var Immutable = require('immutable');

var _require = require('rx');

var O = _require.Observable;

var H = require('./helpers');

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

  applyDefaults: function applyDefaults(config) {
    return Config.defaults(config).merge(config);
  },

  /* Parses the config JSON */
  parse: function parse(location) {
    return function (configStr) {
      try {
        return Immutable.fromJS(Object.assign(JSON.parse(configStr), { location: location }));
      } catch (e) {
        throw new Error('Failed to parse config file: ' + location);
      }
    };
  },

  readConfig: function readConfig() {
    var configLocations = arguments.length <= 0 || arguments[0] === undefined ? Config.locations : arguments[0];
    return H.findExistingDirectory(configLocations).catch(function () {
      return O.throw('No config file found! RTFM!');
    }).flatMap(function (location) {
      return H.readFile(location + '/' + Config.filename).map(Config.parse(location)).map(Config.applyDefaults);
    });
  }
};

module.exports = Config;