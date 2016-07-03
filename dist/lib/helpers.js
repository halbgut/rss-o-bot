'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

/**
 * helpers
 * Helper functions used by multiple modules.
 */
var fs = require('fs');
var path = require('path');
var markedMan = require('marked-man');

var _require = require('rx');

var O = _require.Observable;

var debug = require('debug')('rss-o-bot');

var domainRegex = '([\\w\\d-]+\\.)+\\w{2,}';
var protoRegex = '\\w+:\\/\\/';

var Helpers = {
  /*
   * fs releated
   */
  readFile: O.fromNodeCallback(fs.readFile),
  writeFile: O.fromNodeCallback(fs.writeFile),
  stat: O.fromNodeCallback(fs.stat),
  isDirectory: function isDirectory(path) {
    return Helpers.stat(path).map(Helpers.tryCall('isDirectory'));
  },
  findExistingDirectory: function findExistingDirectory(locations) {
    return O.of(locations[0]).flatMap(function (l) {
      return l ? Helpers.isDirectory(l).flatMap(function (is) {
        return is ? O.of(l) : Helpers.findExistingDirectory(locations.slice(1));
      }) : O.throw('None of those directories exist');
    });
  },

  /*
   * Functional helpers
   */
  tryCall: function tryCall(key) {
    for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      args[_key - 1] = arguments[_key];
    }

    return function (obj) {
      return typeof obj[key] === 'function' ? obj[key].apply(obj, args) : false;
    };
  },

  tryGet: function tryGet() {
    for (var _len2 = arguments.length, keys = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      keys[_key2] = arguments[_key2];
    }

    return function (obj) {
      return (typeof obj === 'undefined' ? 'undefined' : _typeof(obj)) === 'object' ? keys.length > 1 ? obj[keys[0]] ? Helpers.tryGet.apply(Helpers, _toConsumableArray(keys.slice(1)))(obj[keys[0]]) : obj[keys[0]] : obj[keys[0]] : obj;
    };
  },

  /*
   * Key exchange related
   */
  privateKeyPath: function privateKeyPath(config) {
    return path.normalize(config.get('location') + '/priv.pem');
  },
  publicKeyPath: function publicKeyPath(config) {
    return path.normalize(config.get('location') + '/pub.pem');
  },

  getTime: function getTime() {
    var mod = arguments.length <= 0 || arguments[0] === undefined ? 0 : arguments[0];

    return Math.round(new Date().getTime() / 1000) + mod;
  },


  /*
   * RSS-o-Bot filter helpers
   */
  transformFilter: function transformFilter(filter) {
    return filter[0] === '!' ? { keyword: filter.substr(1), kind: false } : { keyword: filter, kind: true };
  },


  /*
   * URL manipulation
   */
  isAbsoluteUrl: function isAbsoluteUrl(str) {
    return !!str.match(new RegExp('^' + protoRegex + '|' + domainRegex));
  },
  getBaseUrl: function getBaseUrl(url) {
    var match = url.match(new RegExp('(' + protoRegex + ')?' + domainRegex));
    if (!match) return '';
    return match[0];
  },


  buildMan: function buildMan(state) {
    return O.forkJoin(Helpers.readFile(__dirname + '/../../src/man/man.md'), Helpers.readFile(__dirname + '/../../src/man/synopsis.md')).map(function (_ref) {
      var _ref2 = _slicedToArray(_ref, 2);

      var f1 = _ref2[0];
      var f2 = _ref2[1];
      return [f1.toString(), f2.toString()];
    }).map(function (args) {
      return [].concat(_toConsumableArray(args), [require('../../package.json')]);
    }).map(function (_ref3) {
      var _ref4 = _slicedToArray(_ref3, 3);

      var raw = _ref4[0];
      var synopsis = _ref4[1];
      var packageInfo = _ref4[2];
      return [raw, synopsis, packageInfo, raw.replace('[[SYNOPSIS]]', synopsis).replace('[[VERSION]]', packageInfo.version)];
    }).map(function (_ref5) {
      var _ref6 = _slicedToArray(_ref5, 4);

      var raw = _ref6[0];
      var synopsis = _ref6[1];
      var version = _ref6[2].version;
      var man = _ref6[3];
      return {
        raw: raw,
        synopsis: synopsis,
        man: markedMan(raw, { version: version, section: 1 })
      };
    });
  },

  /* Prints all feed in a bare table */
  printFeeds: function printFeeds(feeds) {
    return O.forkJoin(feeds.map(function (feed) {
      return O.fromPromise(feed.getFilters().then(function (filters) {
        return [feed.get('id'), feed.get('blogTitle'), feed.get('url'), filters.map(function (f) {
          return f.get('kind') ? f.get('keyword') : '!' + f.get('keyword');
        }).join(', ')];
      }));
    })).map(function (feeds) {
      return feeds.map(function (_ref7) {
        var _ref8 = _slicedToArray(_ref7, 4);

        var id = _ref8[0];
        var blogTitle = _ref8[1];
        var url = _ref8[2];
        var filters = _ref8[3];
        return id + ': ' + blogTitle + ' – ' + url + ' – ' + filters + '\n';
      }).join('');
    });
  },

  /*
   * Helpers for finding commands
   */
  getCommand: function getCommand(commands) {
    return function (state) {
      var command = Helpers.findCommand(commands, state.get('action'));
      if (!command) throw new Error('No such command: ' + state.get('action'));
      debug('Running command ' + command[0]);
      return Helpers.setCommandState(state)(command);
    };
  },

  setCommandState: function setCommandState(state) {
    return function (command) {
      return state.set('command', Helpers.tryGet(2)(command)).set('localOnly', Helpers.tryGet(3)(command));
    };
  },

  findCommand: function findCommand(commands, action, args) {
    return commands.find(function (_ref9) {
      var _ref10 = _slicedToArray(_ref9, 3);

      var command = _ref10[0];
      var validator = _ref10[1];
      var run = _ref10[2];
      return ((typeof command === 'undefined' ? 'undefined' : _typeof(command)) === 'object' ? command.indexOf(action) > -1 : command === action) && (typeof validator === 'function' ? validator(args) : validator);
    });
  },

  /* Extracts the config and arguments from a state */
  getConfigAndArgs: function getConfigAndArgs(state) {
    return [state.get('configuration')].concat(_toConsumableArray(state.get('arguments').toJS()));
  },

  /* Makes most common preparation steps for a command */
  setUpEnv: function setUpEnv(init) {
    return function (state) {
      return init(state.get('configuration')).map(function (store) {
        return [store].concat(_toConsumableArray(Helpers.getConfigAndArgs(state)));
      });
    };
  }
};

module.exports = Helpers;