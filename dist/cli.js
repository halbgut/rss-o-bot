#!/usr/bin/env node
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

function _toArray(arr) { return Array.isArray(arr) ? arr : Array.from(arr); }

var fs = require('fs');

var _require = require('./lib/helpers');

var getConfig = _require.getConfig;
var transformFilter = _require.transformFilter;
var buildMan = _require.buildMan;

var config = getConfig();
var initStore = require('./lib/store');
var notify = require('./lib/notify')(config);
var opml = require('./lib/opml');

var action = process.argv[2];
var args = process.argv.slice(3);

process.title = 'rss-o-bot';

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
} else if (action === 'poll-telegram') {} else if (action === 'import' && args[0]) {
  var _args3 = _slicedToArray(args, 1);

  var file = _args3[0];

  initStore(config).flatMap(opml.import(file)).subscribe(printFeeds, console.error);
} else if (action === 'export') {
  initStore(config).flatMap(opml.export).subscribe(console.log, console.error);
} else if (action === 'run' || !action) {
  require('.')();
} else if (action === '-h' || action === '--help') {
  process.stdout.write(buildMan().synopsis + '\n\nPlease refer to `man rss-o-bot`, `rss-o-bot --manual` or the README for further instructions.');
} else if (action === '-m' || action === '--manual') {
  process.stdout.write(buildMan().raw);
} else if (action === 'build-man') {
  fs.writeFileSync(__dirname + '/../dist/man/rss-o-bot.1', buildMan().man);
} else if (action === '-v' || action === '--version') {
  var packageInfo = require('../package.json');
  console.log('RSS-o-Bot Version: ' + packageInfo.version);
} else {
  process.stderr.write('Unrecognized action: ' + action + '\n ' + buildMan().synopsis);
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