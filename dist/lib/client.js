'use strict';

var WebSocket = require('faye-websocket');
var Rx = require('rx');
var O = Rx.Observable;

module.exports = {
  send: function send(url, message) {
    return O.create(function (o) {
      var ws = new WebSocket.Client(url);
      ws.on('open', function () {
        ws.send(message);
      });
      ws.on('message', function (msg) {
        return o.onNext(msg);
      });
      ws.on('error', function (err) {
        return o.onError(err);
      });
      ws.on('close', function () {
        return o.onCompleted();
      });
    });
  }
};