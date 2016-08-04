'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

/**
 * index
 * This module exports a function with a config property.
 * The main function takes no parameters and simply runs
 * the daemon process.
 */

var _require = require('rx');

var O = _require.Observable;


var Config = require('./lib/config');
var Helpers = require('./lib/helpers');
var initStore = require('./lib/store');
var pollFeeds = require('./lib/pollFeeds')(Helpers);
var Notify = require('./lib/notify');

module.exports = function runRSSOBotDaemon(state) {
  var config = state.get('configuration');
  O.combineLatest(initStore(config), O.interval(config.get('interval') * 1000).startWith(0), function (_ref) {
    var _ref2 = _slicedToArray(_ref, 1);

    var s = _ref2[0];
    return s;
  }).flatMap(pollFeeds(Notify(config)))
  /* Restart on error */
  .catch(function (err) {
    console.error(err);
    return runRSSOBotDaemon(state);
  }).subscribe(function () {}, console.error);
};

module.exports.pollFeeds = pollFeeds;
module.exports.getConfig = Config.readConfig;