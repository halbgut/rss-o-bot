'use strict';

var _require = require('./helpers');

var getConfig = _require.getConfig;

var WebSocket = require('faye-websocket');
var jwt = require('jsonwebtoken');
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
            var respond = function respond(msg) {
              return O.create(function (o) {
                jwt.sign(msg, getConfig('remote-key'), {}, function (err, token) {
                  if (err) return o.onError(err);
                  ws.send(token);
                });
              });
            };
            ws.on('message', function (e) {
              jwt.verify(e.data, getConfig('remote-key'), {}, function (err, data) {
                if (err) return o.onError(err);
                o.onNext([data, respond]);
              });
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