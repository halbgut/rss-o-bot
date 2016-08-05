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
      sends = setMethods.map(function (m) {
        var configObj = config.toJS();
        var module = 'rss-o-bot-' + m;
        var msg = 'Successfully loaded notifier: ' + module;
        try {
          try {
            /* Attempt local require */
            var send = require(module)(configObj);
            debug(msg);
            return send;
          } catch (e) {
            /* Attempt global require */
            var _send = require(__dirname + '/../../../' + module)(configObj);
            debug(msg);
            return _send;
          }
        } catch (e) {
          /* Notifier not found */
          console.error(e);
          debug('Failed to load notifier: ' + module);
        }
      }).filter(function (f) {
        return f;
      }); /* Exclude all notifiers, that weren't found */
    } else {
        sends = [O.of];
      }

    return function (blog, link, title) {
      return(
        /* Call all registered notifiers */
        O.forkJoin(sends.map(function (f) {
          return f(blog, link, title);
        }))
      );
    };
  };
};