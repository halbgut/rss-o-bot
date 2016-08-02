'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var fs = require('fs');

var Immutable = require('immutable');
var runCLI = require('../../../dist/cli.js');
var initStore = require('../../../dist/lib/store');
var Config = require('../../../dist/lib/config');

var databases = [];

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
module.exports.removeDatabases = removeDatabases;

var getConfig = function () {
  var id = arguments.length <= 0 || arguments[0] === undefined ? 0 : arguments[0];
  return function () {
    var db = __dirname + '/../../../data/test_feeds-' + ++id + '.sqlite';
    databases.push(db);
    return {
      'database': {
        'name': 'data',
        'options': {
          'dialect': 'sqlite',
          'storage': db
        }
      }
    };
  };
}();
module.exports.getConfig = getConfig;

var toConfig = function toConfig(object) {
  return Config.applyDefaults(Immutable.fromJS(object));
};
module.exports.toConfig = toConfig;

var getConfigWithDefaults = function getConfigWithDefaults() {
  return toConfig(getConfig());
};
module.exports.getConfigWithDefaults = getConfigWithDefaults;

var handleError = function handleError(t) {
  return function (err) {
    console.error(err);
    t.fail('test failed');
    t.end();
  };
};
module.exports.handleError = handleError;

var run = function run(a) {
  var n = arguments.length <= 1 || arguments[1] === undefined ? 1 : arguments[1];
  return function (f) {
    return function (t) {
      if (n) t.plan(n);
      var config = toConfig(getConfig());
      var o = runCLI(['node', ''].concat(_toConsumableArray(a)), null, config);
      f(t, o, config).subscribe(function () {}, handleError(t), function () {
        return t.end();
      });
    };
  };
};
module.exports.run = run;

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
module.exports.parsePrintedFeeds = parsePrintedFeeds;

var containsFeedUrl = function containsFeedUrl(url, t) {
  return function (feeds) {
    var feedsMatching = feeds.filter(function (feed) {
      return typeof feed.get === 'function' ? feed.get('url') === url : feed[2] === url;
    });
    return t.true(feedsMatching.length >= 1);
  };
};
module.exports.containsFeedUrl = containsFeedUrl;

var getStoreAnd = function getStoreAnd(cb) {
  return function (config) {
    return initStore(config).flatMap(cb);
  };
};
module.exports.getStoreAnd = getStoreAnd;

var getStoreAndListFeeds = getStoreAnd(function (_ref) {
  var listFeeds = _ref.listFeeds;
  return listFeeds();
});
module.exports.getStoreAndListFeeds = getStoreAndListFeeds;