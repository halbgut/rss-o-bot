'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var fs = require('fs');

var _require = require('ava');

var test = _require.test;


var runCLI = require('../../dist/cli.js');
var configLocations = [__dirname + '/../config/local'];
var initStore = require('../../dist/lib/store');
var Config = require('../../dist/lib/config');
var H = require('../../dist/lib/helpers');

var handleError = function handleError(t) {
  return function (err) {
    console.error(err);
    t.fail('poll-feeds failed');
    t.end();
  };
};

var run = function run(a) {
  var n = arguments.length <= 1 || arguments[1] === undefined ? 1 : arguments[1];
  return function (f) {
    return function (t) {
      t.plan(n);
      var o = runCLI(['node', ''].concat(_toConsumableArray(a)), configLocations);
      f(t, o).subscribe(function () {}, handleError(t), function () {
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

test.after('remove DB', function (t) {
  fs.unlink(__dirname + '/../../data/test_feeds.sqlite');
  t.pass();
});

test.cb('version', run(['-v'])(function (t, o) {
  return o.map(function (version) {
    return t.regex(version, /RSS\-o\-Bot Version: \d+\.\d+\.\d+/);
  });
}));

test.cb('help', run(['-h'])(function (t, o) {
  return o.map(function (help) {
    return help.length > 100 ? t.pass() : t.fail();
  });
}));

test.cb('man', run(['-m'])(function (t, o) {
  return o.map(function (man) {
    return man.length > 1000 ? t.pass() : t.fail();
  });
}));

/* function to create dummy posts */
var createDummyPost = function createDummyPost(url) {
  var filters = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];
  return Config.readConfig(configLocations).flatMap(initStore).flatMap(function (store) {
    return store.insertFeed(url, filters).map(store);
  });
};(function () {
  var url = 'https://lucaschmid.net/feed/rss.xml';
  var filter = 'somefilter';
  test.serial.cb('add', run(['add', url, filter], 3)(function (t, o) {
    return o.map(function (feed) {
      var _parsePrintedFeeds$ = _slicedToArray(parsePrintedFeeds(feed)[0], 4);

      var id = _parsePrintedFeeds$[0];
      var title = _parsePrintedFeeds$[1];
      var setUrl = _parsePrintedFeeds$[2];
      var filters = _parsePrintedFeeds$[3];

      t.deepEqual([title, setUrl, filters], ['undefined', url, filter]);
      t.regex(id, /\d+/);
    }).flatMap(Config.readConfig(configLocations)).flatMap(initStore).flatMap(H.tryCall('getFeeds')).map(containsFeedUrl(url, t));
  }));

  test.cb('list', function (t) {
    t.plan(1);
    Config.readConfig(configLocations).flatMap(initStore).flatMap(H.tryCall('insertFeed', url, [])).flatMap(function () {
      return runCLI(['node', '', 'list'], configLocations);
    }).map(parsePrintedFeeds).map(containsFeedUrl(url, t)).subscribe(function () {}, handleError(t), function () {
      return t.end();
    });
  });

  var rmTestURL = 'https://lucaschmid.net/feed/atom.xml';
  test.serial.cb('rm', function (t) {
    t.plan(1);
    var store$ = Config.readConfig(configLocations).flatMap(initStore);

    store$.flatMap(function (_ref) {
      var insertFeed = _ref.insertFeed;
      var listFeeds = _ref.listFeeds;
      return insertFeed(rmTestURL, []).flatMap(listFeeds).map(function (feeds) {
        return feeds.filter(function (feed) {
          return feed.get('url') === rmTestURL;
        });
      }).map(function (feeds) {
        return feeds[0].get('id');
      }).flatMap(function (feedId) {
        return runCLI(['node', '', 'rm', feedId], configLocations).map(function () {
          return feedId;
        });
      }).flatMap(function (feedId) {
        return listFeeds().map(function (feeds) {
          return t.deepEqual(feeds.filter(function (feed) {
            return feed.get('id') === feedId;
          }).length, 0);
        });
      });
    }).subscribe(function () {}, handleError(t), function () {
      return t.end();
    });
  });
})();(function () {
  var url = 'https://lucaschmid.net/feed/rss.xml';
  test.cb('poll-feeds', function (t) {
    createDummyPost(url).flatMap(function (store) {
      return runCLI(['node', '', 'poll-feeds'], configLocations).map(function () {
        return store;
      });
    }).flatMap(function (_ref2) {
      var listFeeds = _ref2.listFeeds;
      return listFeeds();
    }).tap(function (feeds) {
      return t.truthy(feeds[0].get('title') !== 'undefined');
    }).subscribe(function () {}, handleError(t), function () {
      return t.end();
    });
  });
})();