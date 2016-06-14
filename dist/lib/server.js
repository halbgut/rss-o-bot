'use strict';

var _require = require('./helpers');

var getConfig = _require.getConfig;

var WebSocket = require('faye-websocket');
var http = require('http');
var Rx = require('rx');
var O = Rx.Observable;

module.exports = {
  listen: function listen() {
    return O.create(function (o) {
      var port = getConfig('port');

      http.createServer().on('upgrade', function (request, socket, body) {
        if (WebSocket.isWebSocket(request)) {
          (function () {
            var ws = new WebSocket(request, socket, body);
            ws.on('message', function (msg) {
              return o.onNext([ws, msg]);
            });
            ws.on('error', function (err) {
              ws = null;
              o.onError(err);
            });
            ws.on('end', function () {
              ws = null;
              o.onCompleted();
            });
          })();
        }
      }).listen(port);
    });
  }
};