#!/usr/bin/env node
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

function _toArray(arr) { return Array.isArray(arr) ? arr : Array.from(arr); }

/**
 * cli
 * The executable configured by the package.
 */

var initStore = require('./lib/store');
var Notify = require('./lib/notify');
var opml = require('./lib/opml');

var _require = require('rx');

var O = _require.Observable;

var remote = require('./lib/remote');
var server = require('./lib/server');
var debug = require('debug')('rss-o-bot');

/* Pure modules */
var Config = require('./lib/config');
var Argv = require('./lib/argv');
var H = require('./lib/helpers');

var commands = [['add', function (args) {
  return !!args[0];
}, function (state) {
  return O.of(state).flatMap(H.setUpEnv(initStore)).flatMap(function (_ref) {
    var _ref2 = _toArray(_ref);

    var insertFeed = _ref2[0].insertFeed;
    var config = _ref2[1];
    var url = _ref2[2];

    var filters = _ref2.slice(3);

    return insertFeed(url, filters.map(H.transformFilter));
  });
}], ['rm', function (args) {
  return !!args[0];
}, function (state) {
  return O.of(state).flatMap(H.setUpEnv(initStore)).flatMap(function (_ref3) {
    var _ref4 = _slicedToArray(_ref3, 3);

    var removeFeed = _ref4[0].removeFeed;
    var config = _ref4[1];
    var id = _ref4[2];
    return removeFeed(id);
  });
}], ['list', true, function (state) {
  return O.of(state).flatMap(H.setUpEnv(initStore)).flatMap(function (_ref5) {
    var _ref6 = _slicedToArray(_ref5, 1);

    var listFeeds = _ref6[0].listFeeds;
    return listFeeds();
  });
}], ['poll-feeds', true, function (state) {
  return O.of(state).flatMap(H.setUpEnv(initStore)).flatMap(function (_ref7) {
    var _ref8 = _slicedToArray(_ref7, 2);

    var store = _ref8[0];
    var config = _ref8[1];
    return require('.').pollFeeds(config, store, true);
  });
}], ['test-notification', true, function (state) {
  return Notify(state.get('config'))('Test', state.get('arguments').first() || 'test', 'Test Title');
}], ['import', function (args) {
  return !!args[0];
}, function (state) {
  return O.of(state).flatMap(H.setUpEnv(initStore)).map(function (_ref9) {
    var _ref10 = _slicedToArray(_ref9, 1);

    var store = _ref10[0];
    return store;
  })
  // TODO: Perform readFile here instead of inside opml.import
  .flatMap(opml.import(state.get('arguments').first())).flatMap(H.printFeeds);
}], ['export', true, function (state) {
  return O.of(state).flatMap(H.setUpEnv(initStore)).map(function (_ref11) {
    var _ref12 = _slicedToArray(_ref11, 2);

    var config = _ref12[0];
    var store = _ref12[1];
    return store;
  }).flatMap(opml.export);
}], [['run'], true, function (state) {
  return O.create(function (o) {
    require('.')();
  });
}], [['-h', '--help', 'help'], true, function (state) {
  return O.of(state).flatMap(H.buildMan).map(function (_ref13) {
    var synopsis = _ref13.synopsis;
    return synopsis + 'Please refer to `man rss-o-bot`, `rss-o-bot --manual` or the README for further instructions.';
  });
}], [['-m', '--manual', '--man', 'manual'], true, function (state) {
  return O.of(state).flatMap(H.buildMan).map(function (_ref14) {
    var raw = _ref14.raw;
    return raw;
  });
}], [['-v', '--version', 'version'], true, function (state) {
  return O.create(function (o) {
    var packageInfo = require('../package.json');
    o.onNext('RSS-o-Bot Version: ' + packageInfo.version);
    o.onCompleted();
  });
}], ['build-man', true, function (state) {
  return O.of(state).flatMap(H.buildMan).flatMap(function (_ref15) {
    var man = _ref15.man;
    return H.writeFile(__dirname + '/../dist/man/rss-o-bot.1', man);
  }).map(function () {
    return 'Man built';
  });
}, true], ['ping', true, function (state) {
  if (state.get('mode') === 'local') {
    O.of('No server configured, running in local mode. Check the configuration section of the man-page for more info.');
  } else if (state.get('mode') === 'remote') {
    return H.readFile(H.privateKeyPath(state.get('config'))).flatMap(remote.send({ action: 'ping', args: [] }));
  } else if (state.get('mode') === 'server') {
    return O.of('pong');
  }
}, true]];

var runCLI = function runCLI() {
  var argv = arguments.length <= 0 || arguments[0] === undefined ? process.argv : arguments[0];
  var configLocations = arguments.length <= 1 || arguments[1] === undefined ? Config.locations : arguments[1];
  return O.of(argv)
  /* Extract arguments */
  .map(Argv.extractArguments)
  /* Get config */
  .flatMap(function (state) {
    return H.findExistingDirectory(configLocations).catch(function () {
      return O.throw('No config file found! RTFM!');
    }).flatMap(function (location) {
      return H.readFile(location + '/' + Config.filename).map(Config.parse(state, location));
    });
  }).map(Config.applyDefaults)
  /* Define mode */
  .map(function (state) {
    return state.set('mode', state.getIn(['configuration', 'remote']) ? 'remote' : state.getIn(['configuration', 'mode']));
  }).map(Argv.applyModeFlags).map(H.getCommand(commands))
  /* Run command */
  .flatMap(function (state) {
    var mode = state.get('mode');
    var config = state.get('configuration');
    /* Execute the command locally */
    if (mode === 'local' || state.get('localOnly')) {
      debug('running command locally');
      return state.get('command')(state);
      /* Send to a server */
    } else if (mode === 'remote') {
        debug('Sending command as remote');
        return H.readFile(H.privateKeyPath(config)).flatMap(remote.send(config.get('remote'), {
          action: state.get('action'),
          arguments: state.get('arguments').toJS()
        }));
      } else if (mode === 'server') {
        if (state.get('mode') === 'server') {
          /* Ignore any command passed, since there's only
           * `run` on the server.
           */
          return H.readFile(H.publicKeyPath(config)).flatMap(server.listen(config)).map(function (_ref16) {
            var _ref17 = _slicedToArray(_ref16, 2);

            var data = _ref17[0];
            var respond = _ref17[1];

            /* Must be a public key */
            if (typeof data === 'string') {
              debug('Recieved public key');
              return H.writeFile(H.publicKeyPath(config), data);
            } else {
              debug('Executing command ' + data.action);
              var cState = H.setCommandState(state)(H.findCommand(commands, data.action, data.args));
              if (cState.get('localOnly')) return O.throw(new Error('Local-only command can\'t be executed on a server'));
              return cState.get('command')(state);
            }
          });
        }
      }
  });
};

module.exports = runCLI;

if (!process.env['RSS-O-BOT-TESTING-MODE']) {
  runCLI().subscribe(console.log, console.error);
}