'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var Rx = require('rx');
var O = Rx.Observable;

var _require = require('./lib/helpers');

var getConfig = _require.getConfig;

var config = getConfig();
var notify = require('./lib/notify')(config);
var poll = require('./lib/poll');
var initStore = require('./lib/store');

O.combineLatest(initStore(config), Rx.Observable.interval(config.interval * 1000).startWith(0)).flatMap(function (_ref) {
  var _ref2 = _slicedToArray(_ref, 1);

  var _ref2$ = _ref2[0];
  var getFeeds = _ref2$.getFeeds;
  var insertFeed = _ref2$.insertFeed;
  var updateLatestLink = _ref2$.updateLatestLink;
  return getFeeds().flatMap(function (feeds) {
    var _Rx$Observable;

    return (_Rx$Observable = Rx.Observable).combineLatest.apply(_Rx$Observable, _toConsumableArray(feeds.map(function (feed) {
      return O.fromPromise(feed.getFilters()).flatMap(function (filters) {
        return O.onErrorResumeNext(poll(feed.get('url'), filters.map(function (f) {
          return [f.get('keyword'), f.get('kind')];
        })).retry(2).flatMap(function (info) {
          return updateLatestLink(feed.get('id'), info.latestLink).map(info);
        }).filter(function (_ref3) {
          var latestLink = _ref3.latestLink;
          return latestLink && feed.get('latestLink') && latestLink !== feed.get('latestLink');
        }).flatMap(function (_ref4) {
          var blog = _ref4.blog;
          var latestLink = _ref4.latestLink;
          return notify(blog, latestLink).retry(2);
        }));
      }, O.just().tap(function () {
        return console.error('Failed to get ' + feed.get('url'));
      }));
    })));
  });
}).subscribe(function () {}, function (err) {
  return console.log('ERROR') || console.error(err);
}, function () {
  return console.log('Complete');
});