'use strict';

/**
 * notifiy
 * This module notifies about new entries users.
 */
var Rx = require('rx');
var debug = require('debug')('rss-o-bot');

module.exports = function (config) {
  var sends =
  /**
   * Map over all configured notification methods and check if there
   * are installed modules by that name.
   */
  config.get('notification-methods').map(function (m) {
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
  return function (blog, link, title) {
    return(
      /* Call all registered notifiers */
      Rx.Observable.forkJoin(sends.map(function (f) {
        return f(blog, link, title);
      }))
    );
  };
};