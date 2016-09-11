#!/usr/bin/env node
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

function _toArray(arr) { return Array.isArray(arr) ? arr : Array.from(arr); }

/**
 * @file
 *
 * cli
 * The executable configured by the package.
 */

var _require = require('rx');

var O = _require.Observable;

var Immutable = require('immutable');
var debug = require('debug')('rss-o-bot');

var H = require('./lib/helpers');
var Errors = require('./lib/errors');
var throwO = Errors.throwO;
var NO_PRIVATE_KEY_FOUND = Errors.NO_PRIVATE_KEY_FOUND;
var NO_REMOTE_CONFIGURED = Errors.NO_REMOTE_CONFIGURED;

var initStore = require('./lib/store')(H);
var Notify = require('./lib/notify')(H);
var opml = require('./lib/opml')(H);
var remote = require('./lib/remote')(H);
var Server = require('./lib/server')(H, Errors);
var genKeys = require('./lib/gen-keys')(H, Errors);

/* Pure modules */
var Config = require('./lib/config')(H);
var Argv = require('./lib/argv');

var commands = [['add', function (args) {
  return !!args.get(0);
}, function (state) {
  return O.of(state).flatMap(H.setUpEnv(initStore)).flatMap(function (_ref) {
    var _ref2 = _toArray(_ref);

    var insertFeed = _ref2[0].insertFeed;
    var config = _ref2[1];
    var url = _ref2[2];

    var filters = _ref2.slice(3);

    return insertFeed(url, filters.map(H.transformFilter));
  }).map(function (f) {
    return [f];
  }).flatMap(H.printFeeds);
}], ['rm', function (args) {
  return !!args.get(0);
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
  }).flatMap(H.printFeeds);
}], ['poll-feeds', true, function (state) {
  return O.of(state).flatMap(H.setUpEnv(initStore)).flatMap(function (_ref7) {
    var _ref8 = _slicedToArray(_ref7, 2);

    var store = _ref8[0];
    var config = _ref8[1];
    return require('.').pollFeeds(Notify(config))(store, true);
  });
}], ['test-notification', true, function (state) {
  return Notify(state.get('config'))('Test', state.get('arguments').first() || 'test', 'Test Title');
}], ['import', function (args) {
  return !!args.get(0);
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
    var _ref12 = _slicedToArray(_ref11, 1);

    var store = _ref12[0];
    return store;
  }).flatMap(opml.export);
}], [['run'], true, function (state) {
  return O.create(function (o) {
    require('.')(state);
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
    return H.writeFile(__dirname + '/../dist/docs/rss-o-bot.1', man);
  }).map(function () {
    return 'Man built';
  });
}, true], ['ping', true, function (state) {
  if (state.get('mode') === 'local') {
    return throwO(NO_REMOTE_CONFIGURED);
  } else if (state.get('mode') === 'remote') {
    var privK = state.get('privateKey');
    if (!privK) return throwO(NO_PRIVATE_KEY_FOUND);
    debug('Sending ping.');
    return remote.send(H.getRemoteUrl(state.get('configuration')), { action: 'ping', args: [] })(privK);
  } else if (state.get('mode') === 'server') {
    return O.of('pong');
  }
}, true], ['gen-keys', true, function (state) {
  /* Generate a key pair */
  var serverUrl = H.getRemoteUrl(state.get('configuration'));
  return genKeys(state.get('configuration')).flatMap(getKeys(state))
  /* Send the public key to the server */
  .do(function () {
    return debug('Sending public key to ' + serverUrl);
  }).flatMap(function (_ref16) {
    var _ref17 = _slicedToArray(_ref16, 2);

    var pubK = _ref17[1];
    return remote.send(serverUrl, pubK.toString(),
    /* Do it insecurely */
    true)();
  }).map(function () {
    return 'Keys generated and public key transmitted to server.';
  });
}, true]];

var runCommand = function runCommand(state) {
  var mode = state.get('mode');
  var config = state.get('configuration');
  /* Execute the command locally */
  if (mode === 'local' || state.get('localOnly')) {
    debug('Running command locally.');
    return state.get('command')(state);
    /* Send to a server */
  } else if (mode === 'remote') {
      debug('Sending command as remote');
      return H.readFile(H.privateKeyPath(config)).flatMap(remote.send(H.getRemoteUrl(config), {
        action: state.get('action'),
        arguments: state.get('arguments').toJS()
      }));
    } else if (mode === 'server') {
      /* Ignore any command passed, since there's only
       * `run` on the server.
       */
      return Server.run(commands)(state);
    } else {
      throw new Error('Unexpected state mode is set to ' + mode);
    }
};

var getKeys = function getKeys(state) {
  var config = state.get('configuration');
  return O.combineLatest(
  /* If a keyfile can't be opended, simply assume it isn't there */
  H.readFile(H.privateKeyPath(config)).catch(O.of(undefined)), H.readFile(H.publicKeyPath(config)).catch(O.of(undefined)));
};

var runCLI = function runCLI() {
  var argv = arguments.length <= 0 || arguments[0] === undefined ? process.argv : arguments[0];
  var configLocations = arguments.length <= 1 || arguments[1] === undefined ? Config.locations : arguments[1];
  var config = arguments[2];
  return O.of(argv)
  /* Extract arguments */
  .map(Argv.extractArguments)
  /* Get config */
  .flatMap(function (state) {
    return (config ? O.of(Immutable.fromJS(config)).map(Config.applyDefaults) : Config.readConfig(state.getIn(['switches', 'config']) || configLocations)).map(Config.applyOverrides(state.get('switches'))).map(function (c) {
      return state.set('configuration', c);
    });
  })
  /* Define mode */
  .map(function (state) {
    return state.set('mode', state.getIn(['configuration', 'remote']) ? 'remote' : state.getIn(['configuration', 'mode']));
  }).map(H.getCommand(commands)).flatMap(function (state) {
    return state.get('mode') === 'server' || state.get('mode') === 'remote' ? getKeys(state).map(function (_ref18) {
      var _ref19 = _slicedToArray(_ref18, 2);

      var priv = _ref19[0];
      var pub = _ref19[1];
      return state.set('publicKey', pub).set('privateKey', priv);
    }) : O.of(state);
  })
  /* Run command */
  .flatMap(runCommand);
};

module.exports = runCLI;

if (!process.env['RSS_O_BOT_TESTING_MODE']) {
  runCLI().subscribe(console.log, Errors.log);
}