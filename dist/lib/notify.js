'use strict';

var Rx = require('rx');
var debug = require('debug')('rss-o-bot');

module.exports = function (config) {
  var sends = config['notification-methods'].map(function (m) {
    var module = 'rss-o-bot-' + m;
    var msg = 'Successfully loaded notifier: ' + module;
    try {
      try {
        var send = require(module)(config);
        debug(msg);
        return send;
      } catch (e) {
        var _send = require(__dirname + '/../../' + module)(config); // Global require
        debug(msg);
        return _send;
      }
    } catch (e) {
      console.error(e);
      debug('Failed to load notifier: ' + module);
    }
  }).filter(function (f) {
    return f;
  });
  return function (blog, link) {
    return Rx.Observable.forkJoin(sends.map(function (f) {
      return f(blog + ' posted something new.', link);
    }));
  };
};