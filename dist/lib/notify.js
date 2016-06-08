'use strict';

var Rx = require('rx');
var debug = require('debug')('rss-o-bot');

module.exports = function (config) {
  var sends = config['notification-methods'].map(function (m) {
    var module = 'rss-o-bot-' + m;
    try {
      var send = require(module)(config);
      debug('Successfully loaded notifier: ' + module);
      return send;
    } catch (e) {
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