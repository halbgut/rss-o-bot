'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

/**
 * helpers
 * Helper functions used by multiple modules.
 */
var fs = require('fs');
var path = require('path');
var markedMan = require('marked-man');
var debug = require('debug')('rss-o-bot');

var locations = [__dirname + '/../../data', process.platform === 'win32' ? process.env.USERPROFILE + '/.rss-o-bot' : process.env.HOME + '/.rss-o-bot'].map(function (l) {
  return path.normalize(l);
});

var configError = 'No config file found!\nRTFM and put one in one of these locations:\n' + locations.join(', ') + '\n';

var domainRegex = '([\\w\\d-]+\\.)+\\w{2,}';
var protoRegex = '\\w+:\\/\\/';
var defaults = {
  port: 3645,
  interval: 600,
  'jwt-expiration': 60,
  database: {
    name: 'rss-o-bot',
    options: {
      dialect: 'sqlite',
      storage: locations[1] + '/feeds.sqlite'
    }
  }
};

var getConfig = function () {
  var config = locations.filter(function (l) {
    try {
      return fs.statSync(l).isDirectory();
    } catch (e) {
      return false;
    }
  }).slice(0, 1).map(function (l) {
    return debug('Loading config ' + l) || [fs.readFileSync(path.normalize(l + '/config.json')), l];
  }).map(function (_ref) {
    var _ref2 = _slicedToArray(_ref, 2);

    var c = _ref2[0];
    var l = _ref2[1];
    return Object.assign(defaults, { location: l }, JSON.parse(c));
  })[0];
  return function (key) {
    if (!config) {
      throw new Error(configError);
    }
    return key ? config[key] : config;
  };
}();

var readFile = function readFile(p) {
  return fs.readFileSync(path.normalize(getConfig('location') + '/' + p));
};

var helpers = {
  getTime: function getTime() {
    var mod = arguments.length <= 0 || arguments[0] === undefined ? 0 : arguments[0];

    return Math.round(new Date().getTime() / 1000) + mod;
  },


  getPrivateKey: function getPrivateKey() {
    return readFile('priv.pem').toString();
  },
  getPublicKey: function getPublicKey() {
    return readFile('pub.pem').toString();
  },

  getConfig: getConfig,

  transformFilter: function transformFilter(filter) {
    return filter[0] === '!' ? { keyword: filter.substr(1), kind: false } : { keyword: filter, kind: true };
  },
  isAbsoluteUrl: function isAbsoluteUrl(str) {
    return !!str.match(new RegExp('^' + protoRegex + '|' + domainRegex));
  },
  getBaseUrl: function getBaseUrl(url) {
    var match = url.match(new RegExp('(' + protoRegex + ')?' + domainRegex));
    if (!match) return '';
    return match[0];
  },
  buildMan: function buildMan() {
    var packageInfo = require('../../package.json');
    var synopsis = fs.readFileSync(__dirname + '/../../src/man/synopsis.md').toString();
    var raw = fs.readFileSync(__dirname + '/../../src/man/man.md').toString().replace('[[SYNOPSIS]]', synopsis).replace('[[VERSION]]', packageInfo.version);
    var man = markedMan(raw, {
      version: packageInfo.version,
      section: 1
    });
    return { synopsis: synopsis, man: man, raw: raw };
  }
};

module.exports = helpers;