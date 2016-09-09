'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var fs = require('fs');

var _require = require('child_process');

var spawn = _require.spawn;

var _require2 = require('rx');

var O = _require2.Observable;

var Immutable = require('immutable');
var uuid = require('node-uuid');
var R = require('ramda');

var runCLI = require('../../../dist/cli.js');
var H = require('../../../dist/lib/helpers');
var initStore = require('../../../dist/lib/store')(H);
var Config = require('../../../dist/lib/config')(H);

var DEBUG = process.env.DEBUG;
var databases = [];

var getConfig = function () {
  var id = arguments.length <= 0 || arguments[0] === undefined ? 0 : arguments[0];
  return function () {
    var extend = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    var db = __dirname + '/../../../data/test_feeds-' + uuid.v4() + '.sqlite';
    databases.push(db);
    return Object.assign({
      'database': {
        'name': 'data',
        'options': {
          'dialect': 'sqlite',
          'storage': db
        }
      }
    }, extend);
  };
}();

var removeDatabases = function removeDatabases(t) {
  databases.forEach(function (db) {
    try {
      fs.unlinkSync(db);
    } catch (e) {
      /* Ignore errors, since some tests don't ever ope na db */
    }
  });
  t.pass();
};

var toConfig = function toConfig(object) {
  return Config.applyDefaults(Immutable.fromJS(object));
};

var getConfigWithDefaults = function getConfigWithDefaults(extend) {
  return toConfig(getConfig(extend));
};

var handleError = function handleError(t) {
  return function (err) {
    t.fail('test failed: ' + err.message);
    t.end();
  };
};

var run = function run(a) {
  var n = arguments.length <= 1 || arguments[1] === undefined ? 1 : arguments[1];
  var passConfig = arguments.length <= 2 || arguments[2] === undefined ? true : arguments[2];
  return function (f, configExtend, configLocations) {
    return function (t) {
      if (n) t.plan(n);
      var config = passConfig ? toConfig(getConfig(configExtend)) : null;
      var o = runCLI(['node', ''].concat(_toConsumableArray(a)), configLocations, config);
      f(t, o, config).subscribe(function () {}, handleError(t), function () {
        return t.end();
      });
    };
  };
};

var parsePrintedFeeds = function parsePrintedFeeds(feeds) {
  return feeds.split('\n').map(function (feed) {
    if (feed.length < 1) {
      return false;
    } else {
      var _feed$split = feed.split(': ');

      var _feed$split2 = _slicedToArray(_feed$split, 2);

      var id = _feed$split2[0];
      var rest = _feed$split2[1];

      var _rest$split = rest.split(' - ');

      var _rest$split2 = _slicedToArray(_rest$split, 3);

      var title = _rest$split2[0];
      var setUrl = _rest$split2[1];
      var filters = _rest$split2[2];

      return [id, title, setUrl, filters];
    }
  }).filter(function (x) {
    return !!x;
  });
};

var containsFeedUrl = function containsFeedUrl(url, t) {
  return function (feeds) {
    var feedsMatching = feeds.filter(function (feed) {
      return typeof feed.get === 'function' ? feed.get('url') === url : feed[2] === url;
    });
    return t.true(feedsMatching.length >= 1);
  };
};

var getStoreAnd = function getStoreAnd(cb) {
  return function (config) {
    return initStore(config).flatMap(cb);
  };
};

var getStoreAndListFeeds = getStoreAnd(function (_ref) {
  var listFeeds = _ref.listFeeds;
  return listFeeds();
});

var testObservable = function testObservable(o) {
  return function (t) {
    return o.subscribe(function () {}, handleError(t), function () {
      return t.end();
    });
  };
};

/* function to create dummy posts */
var createDummyEntry = function createDummyEntry(url) {
  var filters = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];
  var config = arguments.length <= 2 || arguments[2] === undefined ? getConfigWithDefaults() : arguments[2];
  var storeAndEntity = arguments[3];
  return initStore(config).flatMap(function (store) {
    return store.insertFeed(url, filters).map(function (feed) {
      return storeAndEntity ? [store, feed] : store;
    });
  });
};

var startServer = function startServer(port, configDir, t) {
  var server = spawn('bash', ['-c', 'DEBUG=' + DEBUG + ' RSS_O_BOT_TESTING_MODE= ../../dist/cli.js run --mode=server --config=' + configDir + ' --port=' + port]);

  if (t) {
    t.after.always(function () {
      server.kill();
    });
  }

  return O.fromEvent(server.stdout, 'data').map(R.toString).filter(R.equals('Server started!\n'));
};

module.exports = {
  removeDatabases: removeDatabases,
  getConfig: getConfig,
  toConfig: toConfig,
  getConfigWithDefaults: getConfigWithDefaults,
  handleError: handleError,
  run: run,
  parsePrintedFeeds: parsePrintedFeeds,
  containsFeedUrl: containsFeedUrl,
  getStoreAnd: getStoreAnd,
  getStoreAndListFeeds: getStoreAndListFeeds,
  testObservable: testObservable,
  createDummyEntry: createDummyEntry,
  startServer: startServer
};