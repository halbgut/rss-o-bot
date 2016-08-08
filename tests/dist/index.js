'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var path = require('path');

var _require = require('ava');

var test = _require.test;

var sax = require('sax');

var _require2 = require('rx');

var O = _require2.Observable;


var runCLI = require('../../dist/cli.js');
var H = require('../../dist/lib/helpers');
var initStore = require('../../dist/lib/store')(H);
var Config = require('../../dist/lib/config')(H);
var T = require('./lib/helpers')({ runCLI: runCLI, initStore: initStore, Config: Config });

test.before('remove DB', T.removeDatabases);

test.cb('version', T.run(['-v'])(function (t, o) {
  return o.map(function (version) {
    return t.regex(version, /RSS\-o\-Bot Version: \d+\.\d+\.\d+/);
  });
}));

test.cb('help', T.run(['-h'])(function (t, o) {
  return o.map(function (help) {
    return help.length > 100 ? t.pass() : t.fail();
  });
}));

test.cb('man', T.run(['-m'])(function (t, o) {
  return o.map(function (man) {
    return man.length > 1000 ? t.pass() : t.fail();
  });
}));(function () {
  var url = 'https://lucaschmid.net/feed/rss.xml';
  var filter = 'somefilter';
  test.cb('add', T.run(['add', url, filter], 3)(function (t, o, config) {
    return o.map(function (feed) {
      var _T$parsePrintedFeeds$ = _slicedToArray(T.parsePrintedFeeds(feed)[0], 4);

      var id = _T$parsePrintedFeeds$[0];
      var title = _T$parsePrintedFeeds$[1];
      var setUrl = _T$parsePrintedFeeds$[2];
      var filters = _T$parsePrintedFeeds$[3];

      t.deepEqual([title, setUrl, filters], ['undefined', url, filter]);
      t.regex(id, /\d+/);
    }).flatMap(function () {
      return initStore(config);
    }).flatMap(H.tryCall('getFeeds')).map(T.containsFeedUrl(url, t));
  }));

  test.cb('list', function (t) {
    var config = T.getConfig();
    t.plan(1);
    initStore(T.toConfig(config)).flatMap(H.tryCall('insertFeed', url, [])).flatMap(function () {
      return runCLI(['node', '', 'list'], null, config);
    }).map(T.parsePrintedFeeds).map(T.containsFeedUrl(url, t)).subscribe(function () {}, T.handleError(t), function () {
      return t.end();
    });
  });

  var rmTestURL = 'https://lucaschmid.net/feed/atom.xml';
  test.cb('rm', function (t) {
    var config = T.getConfig();
    t.plan(1);
    var store$ = initStore(T.toConfig(config));

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
    }).subscribe(function () {}, T.handleError(t), function () {
      return t.end();
    });
  });
})();(function () {
  var url = 'https://lucaschmid.net/feed/rss.xml';
  test.cb('poll-feeds', function (t) {
    T.createDummyEntry(url).flatMap(function (store) {
      return runCLI(['node', '', 'poll-feeds'], null, T.getConfig()).map(function () {
        return store;
      });
    }).flatMap(function (_ref2) {
      var listFeeds = _ref2.listFeeds;
      return listFeeds();
    }).tap(function (feeds) {
      return t.truthy(feeds[0].get('title') !== 'undefined');
    }).subscribe(function () {}, T.handleError(t), function () {
      return t.end();
    });
  });
})();

/* Checks if the exported elements contain all elements inside the feed list.
 */
test.cb('export', T.run(['export'], false)(function (t, o, config) {
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
  }).withLatestFrom(T.getStoreAndListFeeds(config)).tap(function (_ref3) {
    var _ref4 = _slicedToArray(_ref3, 2);

    var entry = _ref4[0];
    var list = _ref4[1];
    return t.true(!!list.find(function (item) {
      return item.get('url') === entry[0] && (!item.get('blogTitle') || item.get('blogTitle') === entry[1]);
    }));
  });
}));

var importFile = path.resolve(__dirname, '..', 'data', 'export.xml');
test.cb('import', T.run(['import', importFile], 2)(function (t, o, config) {
  return o.flatMap(function (a) {
    return T.getStoreAndListFeeds(config).map(function (b) {
      return [a, b];
    });
  }).tap(function (_ref5) {
    var _ref6 = _slicedToArray(_ref5, 2);

    var result = _ref6[0];
    var list = _ref6[1];

    t.deepEqual(2, result.split('\n').filter(function (x) {
      return !!x;
    }).length);
    t.true(list.filter(function (item) {
      return item.get('url') === 'https://github.com/Kriegslustig/rss-o-bot-email/commits/master.atom' || item.get('url') === 'https://github.com/Kriegslustig/rss-o-bot-desktop/commits/master.atom';
    }).length >= 2);
  });
}));

test.cb('readConfig', function (t) {
  Config.readConfig([__dirname + '/../config']).flatMap(initStore).flatMap(function (_ref7) {
    var listFeeds = _ref7.listFeeds;
    return listFeeds();
  }).subscribe(function (res) {
    t.true(Array.prototype.isPrototypeOf(res));
  }, T.handleError(t), function () {
    return t.end();
  });
});