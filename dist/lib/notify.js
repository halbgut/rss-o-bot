'use strict';

/**
 * notifiy
 * This module notifies about new entries users.
 */
var _require = require('rx');

var O = _require.Observable;

var debug = require('debug')('rss-o-bot');

module.exports = function (H) {
  return function (config) {
    var sends = void 0;
    var setMethods = config.get('notification-methods');
    if (setMethods && setMethods.length > 0) {
      /**
       * Map over all configured notification methods and check if there
       * are installed modules by that name.
       */
      sends = setMethods.map(function (module) {
        O.onErrorResumeNext(H.isDirectory(module), H.isDirectory(__dirname + '/../../../rss-o-bot-' + module).map(require), H.isDirectory(__dirname + '/../../../' + module).map(require), O.of(module).map(require), O.of('rss-o-bot-' + module).map(require)).map(function (f) {
          return config.toJS();
        }).catch(function () {
          console.error('Failed to load notifier ' + module);
        }).filter(function (f) {
          return f;
        }) /* Exclude all notifiers, that weren't found */
        .tap(function () {
          return debug('Successfully loaded notifier: ' + module);
        });
      });
    } else {
      sends = [O.of];
    }

    return function (blog, link, title) {
      return (
        /* Call all registered notifiers */
        sends.flatMap(function (f) {
          return f(blog, link, title);
        }).last()
      );
    };
  };
};