'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

/**
 * helpers
 * Helper functions used by multiple modules.
 */
var fs = require('fs');
var path = require('path');
var markedMan = require('marked-man');
var debug = require('debug')('rss-o-bot');

var _require = require('rx');

var O = _require.Observable;


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

var cut = function cut(str) {
  var l = arguments.length <= 1 || arguments[1] === undefined ? 100 : arguments[1];
  return str.length > l ? [str.substr(0, l)].concat(_toConsumableArray(cut(str.substr(l), l))) : [str];
};

var helpers = {
  getTime: function getTime() {
    var mod = arguments.length <= 0 || arguments[0] === undefined ? 0 : arguments[0];

    return Math.round(new Date().getTime() / 1000) + mod;
  },


  getPrivateKey: function () {
    var cache = void 0;
    return function () {
      if (!cache) cache = readFile('priv.pem').toString();
      return cache;
    };
  }(),
  getPublicKey: function () {
    var cache = void 0;
    return function () {
      if (!cache) cache = readFile('pub.pem').toString();
      return cache;
    };
  }(),

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
  },


  printFeeds: function printFeeds(feeds) {
    return O.forkJoin(feeds.map(function (feed) {
      return O.fromPromise(feed.getFilters().then(function (filters) {
        return [feed.get('id'), feed.get('url'), filters.map(function (f) {
          return f.get('kind') ? f.get('keyword') : '!' + f.get('keyword');
        }).join(', ')];
      }));
    })).map(function (feeds) {
      return feeds.map(function (_ref3) {
        var _ref4 = _slicedToArray(_ref3, 3);

        var id = _ref4[0];
        var url = _ref4[1];
        var filters = _ref4[2];
        return id + ': ' + url + '  ' + filters + '\n';
      }).join('');
    });
  },
  cut: cut
};

module.exports = helpers;