'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

/**
 * index
 * This module exports a function with a config property.
 * The main function takes no parameters and simply runs
 * the daemon process.
 */
var Rx = require('rx');
var O = Rx.Observable;
var debug = require('debug')('rss-o-bot');

var _require = require('./lib/helpers');

var getConfig = _require.getConfig;

var config = getConfig();
var notify = require('./lib/notify')(config);
var poll = require('./lib/poll');
var initStore = require('./lib/store');

module.exports = function runRSSOBotDaemon() {
  O.combineLatest(initStore(config), Rx.Observable.interval(config.interval * 1000).startWith(0)).flatMap(function (_ref) {
    var _ref2 = _slicedToArray(_ref, 1);

    var s = _ref2[0];
    return pollFeeds(s);
  }).subscribe(function () {}, console.error);
};

module.exports.pollFeeds = pollFeeds;
module.exports.config = config;

function pollFeeds(_ref3, force) {
  var getFeeds = _ref3.getFeeds;
  var insertFeed = _ref3.insertFeed;
  var updateLatestLink = _ref3.updateLatestLink;
  var setBlogTitle = _ref3.setBlogTitle;

  return getFeeds(force).flatMap(function (feeds) {
    var _Rx$Observable;

    return (_Rx$Observable = Rx.Observable).forkJoin.apply(_Rx$Observable, _toConsumableArray(feeds.map(function (feed) {
      return O.fromPromise(feed.getFilters()).flatMap(function (filters) {
        return O.onErrorResumeNext(poll(feed.get('url'), filters.map(function (f) {
          return [f.get('keyword'), f.get('kind')];
        })).retry(2).flatMap(getNewLinks(feed)).filter(function (_ref4) {
          var latestLink = _ref4.latestLink;
          return latestLink && latestLink !== feed.get('latestLink') || debug('Old URL: ' + latestLink);
        }).flatMap(function (info) {
          return feed.get('blogTitle') ? O.of(info) : setBlogTitle(feed.get('id'), info.blogTitle);
        }).flatMap(function (info) {
          return updateLatestLink(feed.get('id'), info.latestLink).map(info);
        }).filter(function () {
          return feed.get('latestLink');
        }).tap(function (_ref5) {
          var latestLink = _ref5.latestLink;
          return debug('New URL: ' + latestLink);
        }).flatMap(function (_ref6) {
          var blog = _ref6.blog;
          var latestLink = _ref6.latestLink;
          var latestTitle = _ref6.latestTitle;
          return notify(blog, latestLink, latestTitle).tap(function () {
            return debug('Sent notifications');
          }).retry(2);
        }));
      }, O.just().tap(function () {
        return console.error('Failed to get ' + feed.get('url'));
      }));
    })));
  });
}

var getNewLinks = function getNewLinks(feed) {
  return function (stream) {
    return feed.get('latestLink') ? O.fromArray(stream.slice(0, stream.findIndex(function (e) {
      return e.latestLink === feed.get('latestLink');
    })).reverse()) : O.of(stream[0]);
  };
};