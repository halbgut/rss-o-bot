'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var path = require('path');
var fs = require('fs');

var _require = require('ava');

var test = _require.test;

var sax = require('sax');

var _require2 = require('rx');

var O = _require2.Observable;

var Immutable = require('immutable');

var runCLI = require('../../dist/cli.js');
var initStore = require('../../dist/lib/store');
var Config = require('../../dist/lib/config');
var H = require('../../dist/lib/helpers');
var databases = [];

var getConfig = function () {
  var id = arguments.length <= 0 || arguments[0] === undefined ? 0 : arguments[0];
  return function () {
    var db = __dirname + '/../../data/test_feeds-' + ++id + '.sqlite';
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

var toConfig = function toConfig(object) {
  return Config.applyDefaults(Immutable.fromJS(object));
};

var getConfigWithDefaults = function getConfigWithDefaults() {
  return toConfig(getConfig());
};

var handleError = function handleError(t) {
  return function (err) {
    console.error(err);
    t.fail('test failed');
    t.end();
  };
};

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

test.after('remove DB', function (t) {
  databases.forEach(function (db) {
    try {
      fs.unlinkSync(db);
    } catch (e) {
      /* Ignore errors, since some tests don't ever ope na db */
    }
  });
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
var createDummyPost = function createDummyPost(name, url) {
  var filters = arguments.length <= 2 || arguments[2] === undefined ? [] : arguments[2];
  return initStore(getConfigWithDefaults()).flatMap(function (store) {
    return store.insertFeed(url, filters).map(store);
  });
};(function () {
  var url = 'https://lucaschmid.net/feed/rss.xml';
  var filter = 'somefilter';
  test.cb('add', run(['add', url, filter], 3)(function (t, o, config) {
    return o.map(function (feed) {
      var _parsePrintedFeeds$ = _slicedToArray(parsePrintedFeeds(feed)[0], 4);

      var id = _parsePrintedFeeds$[0];
      var title = _parsePrintedFeeds$[1];
      var setUrl = _parsePrintedFeeds$[2];
      var filters = _parsePrintedFeeds$[3];

      t.deepEqual([title, setUrl, filters], ['undefined', url, filter]);
      t.regex(id, /\d+/);
    }).flatMap(function () {
      return initStore(config);
    }).flatMap(H.tryCall('getFeeds')).map(containsFeedUrl(url, t));
  }));

  test.cb('list', function (t) {
    var config = getConfig();
    t.plan(1);
    initStore(toConfig(config)).flatMap(H.tryCall('insertFeed', url, [])).flatMap(function () {
      return runCLI(['node', '', 'list'], null, config);
    }).map(parsePrintedFeeds).map(containsFeedUrl(url, t)).subscribe(function () {}, handleError(t), function () {
      return t.end();
    });
  });

  var rmTestURL = 'https://lucaschmid.net/feed/atom.xml';
  test.cb('rm', function (t) {
    var config = getConfig();
    t.plan(1);
    var store$ = initStore(toConfig(config));

    store$.flatMap(function (_ref2) {
      var insertFeed = _ref2.insertFeed;
      var listFeeds = _ref2.listFeeds;
      return insertFeed(rmTestURL, []).flatMap(listFeeds).map(function (feeds) {
        return feeds.filter(function (feed) {
          return feed.get('url') === rmTestURL;
        });
      }).map(function (feeds) {
        return feeds[0].get('id');
      }).flatMap(function (feedId) {
        return runCLI(['node', '', 'rm', feedId], null, config).map(function () {
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
    createDummyPost('poll-feeds', url).flatMap(function (store) {
      return runCLI(['node', '', 'poll-feeds'], null, getConfig()).map(function () {
        return store;
      });
    }).flatMap(function (_ref3) {
      var listFeeds = _ref3.listFeeds;
      return listFeeds();
    }).tap(function (feeds) {
      return t.truthy(feeds[0].get('title') !== 'undefined');
    }).subscribe(function () {}, handleError(t), function () {
      return t.end();
    });
  });
})();

/* Checks if the exported elements contain all elements inside the feed list.
 */
test.cb('export', run(['export'], false)(function (t, o, config) {
  return o.flatMap(function (xmlExport) {
    return O.create(function (o) {
      var parser = sax.parser(true);
      parser.onopentag = function (t) {
        if (t.name !== 'outline') return;
        o.onNext([t.attributes.xmlUrl || t.attributes.url, t.attributes.title]);
      };
      parser.onend = function () {
        o.onCompleted();
      };
      parser.onerror = function (err) {
        return o.onError(err);
      };
      parser.write(xmlExport).close();
    });
  }).withLatestFrom(getStoreAndListFeeds(config)).tap(function (_ref4) {
    var _ref5 = _slicedToArray(_ref4, 2);

    var entry = _ref5[0];
    var list = _ref5[1];
    return t.true(!!list.find(function (item) {
      return item.get('url') === entry[0] && (!item.get('blogTitle') || item.get('blogTitle') === entry[1]);
    }));
  });
}));

var importFile = path.resolve(__dirname, '..', 'data', 'export.xml');
test.cb('import', run(['import', importFile], 2)(function (t, o, config) {
  return o.flatMap(function (a) {
    return getStoreAndListFeeds(config).map(function (b) {
      return [a, b];
    });
  }).tap(function (_ref6) {
    var _ref7 = _slicedToArray(_ref6, 2);

    var result = _ref7[0];
    var list = _ref7[1];

    t.deepEqual(2, result.split('\n').filter(function (x) {
      return !!x;
    }).length);
    t.true(list.filter(function (item) {
      return item.get('url') === 'https://github.com/Kriegslustig/rss-o-bot-email/commits/master.atom' || item.get('url') === 'https://github.com/Kriegslustig/rss-o-bot-desktop/commits/master.atom';
    }).length >= 2);
  });
}));

test.cb('readConfig', function (t) {
  Config.readConfig([__dirname + '/../config']).flatMap(initStore).flatMap(function (_ref8) {
    var listFeeds = _ref8.listFeeds;
    return listFeeds();
  }).subscribe(function (res) {
    t.true(Array.prototype.isPrototypeOf(res));
  }, handleError(t), function () {
    return t.end();
  });
});