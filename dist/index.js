'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

/**
 * index
 * This module exports a function with a config property.
 * The main function takes no parameters and simply runs
 * the daemon process.
 */
var Rx = require('rx');
var O = Rx.Observable;
var debug = require('debug')('rss-o-bot');

var Config = require('./lib/config');
var Notify = require('./lib/notify');
var poll = require('./lib/poll');
var initStore = require('./lib/store');

module.exports = function runRSSOBotDaemon(state) {
  var config = state.get('configuration');
  O.combineLatest(initStore(config), Rx.Observable.interval(config.get('interval') * 1000).startWith(0)).flatMap(function (_ref) {
    var _ref2 = _slicedToArray(_ref, 1);

    var s = _ref2[0];
    return pollFeeds(s);
  })
  /* Restart on error */
  .catch(function (err) {
    console.error(err);
    return runRSSOBotDaemon(state);
  }).subscribe(function () {}, console.error);
};

module.exports.pollFeeds = pollFeeds;
module.exports.getConfig = Config.readConfig;

var queryFeed = function queryFeed(_ref3) {
  var updateLatestLink = _ref3.updateLatestLink;
  var setBlogTitle = _ref3.setBlogTitle;
  return function (feed) {
    var feed$ = O.fromPromise(feed.getFilters()).flatMap(function (filters) {
      return poll(feed.get('url'), filters.map(function (f) {
        return [f.get('keyword'), f.get('kind')];
      })).retry(2).catch(function (err) {
        var msg = 'Failed downloading "' + feed.get('url') + '"';
        debug(msg + ': ' + err);
        throw new Error(msg);
      });
    });

    return feed$.flatMap(getNewLinks(feed)).filter(function (_ref4) {
      var link = _ref4.link;
      return link && link !== feed.get('latestLink') || debug('Old URL: ' + link);
    }).flatMap(function (info) {
      return feed.get('blogTitle') ? O.of(info) : setBlogTitle(feed.get('id'), info.blogTitle);
    }).flatMap(function (info) {
      return updateLatestLink(feed.get('id'), info.link).map(function () {
        return info;
      });
    }).filter(function () {
      return feed.get('latestLink');
    }).tap(function (_ref5) {
      var link = _ref5.link;
      return debug('New URL: ' + link);
    });
  };
};

var notifyWrapper = function notifyWrapper(notify) {
  return function (_ref6) {
    var blog = _ref6.blog;
    var link = _ref6.link;
    var title = _ref6.title;
    return notify(blog, link, title).tap(function () {
      return debug('Sent notifications');
    }).retry(2);
  };
};

function pollFeeds(config, store, force) {
  return O.forkJoin(O.of(Notify(config)), store.getFeeds(force)).flatMap(function (_ref7) {
    var _ref8 = _slicedToArray(_ref7, 2);

    var notify = _ref8[0];
    var feeds = _ref8[1];
    return Rx.Observable.merge(feeds.map(queryFeed(store))).flatMap(notifyWrapper(notify));
  });
}

var getNewLinks = function getNewLinks(feed) {
  return function (stream) {
    return feed.get('latestLink') ? O.fromArray(stream.slice(0, stream.findIndex(function (e) {
      return e.link === feed.get('latestLink');
    })).reverse()) : O.of(stream[0]);
  };
};