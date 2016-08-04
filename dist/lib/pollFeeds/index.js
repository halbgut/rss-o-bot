'use strict';

var _require = require('rx');

var O = _require.Observable;

var debug = require('debug')('rss-o-bot');

var poll = require('./lib/poll');

/* Extracts blog, link and title from a feed-item */
var callbackWrapper = function callbackWrapper(callback) {
  return function (_ref) {
    var blog = _ref.blog;
    var link = _ref.link;
    var title = _ref.title;
    return callback(blog, link, title).tap(function () {
      return debug('Sent notifications');
    }).retry(2);
  };
};

module.exports = function (H) {
  /* Takes a store and a feed entity and returns an observable of new links
   * found on that feed.
   */
  var queryFeed = function queryFeed(_ref2) {
    var updateLatestLink = _ref2.updateLatestLink;
    var setBlogTitle = _ref2.setBlogTitle;
    return function (feed) {
      var feed$ = O.fromPromise(feed.getFilters()).flatMap(function (filters) {
        return poll(feed.get('url'), filters.map(function (f) {
          return [f.get('keyword'), f.get('kind')];
        })).retry(2).catch(function (err) {
          var msg = 'Failed downloading "' + feed.get('url') + '"';
          debug(msg + ': ' + err);
          return O.throw(err);
        });
      });
      return feed$.flatMap(getNewLinks(feed)).filter(function (_ref3) {
        var link = _ref3.link;
        return link && link !== feed.get('latestLink') || debug('Old URL: ' + link);
      }).flatMap(function (info) {
        return feed.get('blogTitle') ? O.of(info) : setBlogTitle(feed.get('id'), info.blogTitle);
      }).flatMap(function (info) {
        return updateLatestLink(feed.get('id'), info.link).map(function () {
          return info;
        });
      }).filter(function () {
        return feed.get('latestLink');
      }).tap(function (_ref4) {
        var link = _ref4.link;
        return debug('New URL: ' + link);
      });
    };
  };

  /* Takes a feed entity and a stream (curried) and checks exctracts all new
   * items from that stream. Then it returns an observable of those items.
   */
  var getNewLinks = function getNewLinks(feed) {
    return function (stream) {
      if (feed.get('latestLink')) {
        var latestIndex = stream.findIndex(function (e) {
          return e.link === feed.get('latestLink');
        });
        var newLinks = stream.slice(0, latestIndex).reverse();
        return O.fromArray(newLinks);
      } else if (stream[0]) {
        return O.of(stream[0]);
      } else if (stream.length < 1) {
        return O.empty();
      } else {
        throw Error('Unexpected state: stream is not an array');
      }
    };
  };

  var PollFeeds = function PollFeeds(callback) {
    return function (store, force) {
      return store.getFeeds(force).flatMap(function (feeds) {
        return O.merge(feeds.map(queryFeed(store))).flatMap(callbackWrapper(callback));
      });
    };
  };
  return PollFeeds;
};