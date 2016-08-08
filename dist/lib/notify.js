'use strict';

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

/**
 * notifiy
 * This module notifies about new entries users.
 */
var _require = require('rx');

var O = _require.Observable;

var debug = require('debug')('rss-o-bot');

module.exports = function (H) {
  return function (config) {
    var setMethods = config.get('notification-methods') || [];
    var notifierFunctions = getNotifierFunctions(H, config, setMethods);

    return function (blog, link, title) {
      return (
        /* Call all registered notifiers */
        O.merge.apply(O, _toConsumableArray(notifierFunctions)).flatMap(function (f) {
          return f(blog, link, title);
        })
        /* The results should be ignored here */
        .last().map(function () {
          return null;
        })
      );
    };
  };
};

var getNotifierFunctions = function getNotifierFunctions(H, config, setMethods) {
  return (
    /* Map over all configured notification methods and check if there
     * are installed modules by that name. require and isDirectory both
     * throw errors if the directory or module doesn't exist.
     */
    setMethods.map(function (module) {
      return typeof module === 'function' ? O.of(module(config)) : O.onErrorResumeNext(H.isDirectory(__dirname + '/../../../rss-o-bot-' + module).map(require), H.isDirectory(__dirname + '/../../../' + module).map(require), O.of(module).map(require), O.of('rss-o-bot-' + module).map(require), H.isDirectory(module).map(require)).catch(function () {
        console.error('Failed to load notifier ' + module);
      }).filter(function (f) {
        return f;
      }) /* Exclude all notifiers, that weren't found */
      .map(function (f) {
        return f(config);
      }).tap(function () {
        return debug('Successfully loaded notifier: ' + module);
      });
    })
  );
};