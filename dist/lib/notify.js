'use strict';

var Rx = require('rx');
var Tg = require('tg-yarl');
var notifier = require('node-notifier');

module.exports = function (config) {
  var sends = config['notification-methods'].map(function (m) {
    if (m === 'telegram') return telegram(config);
    if (m === 'desktop') return desktop(config);
  });
  return function (blog, link) {
    return Rx.Observable.forkJoin(sends.map(function (f) {
      return f(blog + ' posted something new.', link);
    }));
  };
};

function telegram(config) {
  var tg = Tg(config['telegram-api-token']);
  return function (subject, message) {
    return Rx.Observable.forkJoin(config['telegram-recipients'].map(function (r) {
      return Rx.Observable.fromPromise(tg.sendMessage(r, subject + ' \n' + message));
    }));
  };
}

function desktop(config) {
  var notify = Rx.Observable.fromNodeCallback(notifier.notify.bind(notifier));
  return function (title, text) {
    return notify({
      title: title, text: text, open: text
    }).takeUntilWithTime(1000);
  }; // Time out gracefully if nothing happens
}