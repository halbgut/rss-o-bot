#!/usr/bin/env node
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

function _toArray(arr) { return Array.isArray(arr) ? arr : Array.from(arr); }

var Rx = require('rx');
var O = Rx.Observable;

var _require = require('./lib/helpers');

var getConfig = _require.getConfig;
var transformFilter = _require.transformFilter;

var Tg = require('tg-yarl');
var config = getConfig();
var initStore = require('./lib/store');
var notify = require('./lib/notify')(config);
var opml = require('./lib/opml');

var help = 'usage: rss-o-bot [flag | action [arguments]]\n\nFlags:\n  -h, --help                Displays this dialogue\n\nActions:\n  [run]                     Run the deamon process in the foreground\n\n  add url [...filters]      Add a Feed-URL to the database\n\n  rm id                     Remove a Feed-URL from the database\n\n  list                      List all Feed-URLs\n\n  test-notification [url]   Send a test notification over the\n\n                            channels defined in config.json\n  poll-telegram             Continuously checks telegram for new\n                            messages and outputs senders userIds.\n\n  import file               OPML import. Takes a path to an XML-file\n                            As a parameter and scanns it for outline\n                            elements. It\'s standard for RSS clients\n                            to provide an OPML import. These contain\n                            outline tags which the importer searches\n                            for. From those tags, the xmlUrl or Url\n                            Attributes are read as feed-URLs>\n\n  export                    Exports the RSS feeds as OPML. This does\n                            not export the filters.\n\nArguments:\n  url                       A URL of an RSS or Atom feed\n\n  id                        The `id` of a Feed-URL inside the DB.\n                            `id`s can be displayed using `rss-o-bot list`\n\n  ...                       A space sperated list of something\n\n  filters                   Keywords to search for in titles of items inside\n                            feeds. When filters are passed, only notifications\n                            for items containing that word in their title\n                            will be sent. If a filter is prefixed with \'!\',\n                            you will only be notified about items without\n                            that word in their titles.\n';

var action = process.argv[2];
var args = process.argv.slice(3);

if (action === 'add' && args[0]) {
  (function () {
    var _args = _toArray(args);

    var url = _args[0];

    var filters = _args.slice(1);

    initStore(config).flatMap(function (_ref) {
      var insertFeed = _ref.insertFeed;
      return insertFeed(url, filters.map(transformFilter));
    }).subscribe(function (f) {
      return console.log('Added ' + f.get('url'));
    }, console.error, function () {
      return process.exit();
    });
  })();
} else if (action === 'rm' && args[0]) {
  (function () {
    var _args2 = _slicedToArray(args, 1);

    var id = _args2[0];

    initStore(config).flatMap(function (_ref2) {
      var removeFeed = _ref2.removeFeed;
      return removeFeed(id);
    }).subscribe(function () {
      return console.log('Removed.');
    }, console.error, function () {
      return process.exit();
    });
  })();
} else if (action === 'list') {
  initStore(config).flatMap(function (_ref3) {
    var listFeeds = _ref3.listFeeds;
    return listFeeds();
  }).subscribe(printFeeds, console.error);
} else if (action === 'test-notification') {
  var _url = args[0] || 'test';
  notify('Test', _url).subscribe(console.log, console.error, function () {
    return process.exit();
  });
} else if (action === 'poll-telegram') {
  (function () {
    var tg = Tg(config['telegram-api-token']);
    O.interval(1000).startWith(0).flatMap(function () {
      return O.fromPromise(tg.getUpdates());
    }).map(function (res) {
      return res.body.ok ? res.body.result.slice(-1)[0] : null;
    }).distinctUntilChanged(function (update) {
      return update ? update.update_id : null;
    }).map(function (update) {
      return update ? update.message.from.id : null;
    }).subscribe(console.log, console.error, function () {
      return process.exit();
    });
  })();
} else if (action === 'import' && args[0]) {
  var _args3 = _slicedToArray(args, 1);

  var file = _args3[0];

  initStore(config).flatMap(opml.import(file)).subscribe(printFeeds, console.error);
} else if (action === 'export') {
  initStore(config).flatMap(opml.export).subscribe(console.log, console.error);
} else if (action === 'run' || !action) {
  require('.');
} else if (action === '-h' && action === '--help' && action === 'help') {
  process.stdout.write(help);
} else {
  process.stderr.write('Unrecognized action: ' + action + '\n ' + help);
  process.exit(1);
}

function printFeeds(feeds) {
  Promise.all(feeds.map(function (feed) {
    return feed.getFilters().then(function (filters) {
      return [feed.get('id'), feed.get('url'), filters.map(function (f) {
        return f.get('kind') ? f.get('keyword') : '!' + f.get('keyword');
      }).join(', ')];
    });
  })).then(function (feeds) {
    feeds.forEach(function (_ref4) {
      var _ref5 = _slicedToArray(_ref4, 3);

      var id = _ref5[0];
      var url = _ref5[1];
      var filters = _ref5[2];

      process.stdout.write(id + ': ' + url + '  ' + filters + '\n');
    });
    process.stdout.write('\n');
  });
}