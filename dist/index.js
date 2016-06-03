'use strict';

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var Rx = require('rx');

var _require = require('./lib/helpers');

var getConfig = _require.getConfig;

var config = getConfig();
var notify = require('./lib/notify')(config);
var poll = require('./lib/poll');
var initStore = require('./lib/store');

Rx.Observable.interval(config.interval * 1000).startWith(0).flatMap(initStore(config).flatMap(function (_ref) {
  var getFeeds = _ref.getFeeds;
  var insertFeed = _ref.insertFeed;
  var updateLatestLink = _ref.updateLatestLink;
  return getFeeds().flatMap(function (feeds) {
    var _Rx$Observable;

    return (_Rx$Observable = Rx.Observable).combineLatest.apply(_Rx$Observable, _toConsumableArray(feeds.map(function (feed) {
      return Rx.Observable.fromPromise(feed.getFilters()).flatMap(function (filters) {
        return poll(feed.get('url'), filters.map(function (f) {
          return [f.get('keyword'), f.get('kind')];
        })).retry(2).filter(function (_ref2) {
          var latestLink = _ref2.latestLink;
          return latestLink !== feed.get('latestLink');
        }).flatMap(function (_ref3) {
          var blog = _ref3.blog;
          var latestLink = _ref3.latestLink;
          return Rx.Observable.forkJoin(notify(blog, latestLink), updateLatestLink(feed.get('id'), latestLink));
        });
      });
    })));
  });
}).retry().filter(function () {
  return false;
})).subscribe(console.log, console.error, function () {
  return console.log('Complete');
});