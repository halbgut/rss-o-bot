'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _require = require('ava');

var test = _require.test;


var runCLI = require('../../dist/cli.js');
var H = require('../../dist/lib/helpers');
var initStore = require('../../dist/lib/store')(H);
var Config = require('../../dist/lib/config')(H);
var Poll = require('../../dist/lib/pollFeeds/lib/poll.js')(H);
var T = require('./lib/helpers')({ runCLI: runCLI, initStore: initStore, Config: Config });

test.cb('config injection', function (t) {
  var url = 'https://lucaschmid.net/feed/rss.xml';
  var config = T.getConfigWithDefaults({
    'notification-methods': [__dirname + '/lib/notifier.js']
  });
  global.NOTIFIER_TEST_OBJECT = t;
  T.createDummyEntry(url, [], config, true).flatMap(function (_ref) {
    var _ref2 = _slicedToArray(_ref, 2);

    var store = _ref2[0];
    var feed = _ref2[1];
    return Poll(url, []).map(function (entries) {
      return entries.slice(-2);
    }).flatMap(function (_ref3) {
      var _ref4 = _slicedToArray(_ref3, 2);

      var _ = _ref4[0];
      var link = _ref4[1].link;
      return store.updateLatestLink(feed.get('id'), link);
    });
  }).flatMap(function () {
    return runCLI(['node', '', 'poll-feeds'], null, config);
  }).subscribe(function () {}, T.handleError(t));
});