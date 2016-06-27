'use strict';

var _require = require('./helpers');

var getConfig = _require.getConfig;
var getTime = _require.getTime;
var getPublicKey = _require.getPublicKey;

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
              ws.send(msg);
              ws.close();
              ws = null;
            };
            ws.on('message', function (e) {
              if (e.data.indexOf('PUBLIC KEY') > -1) {
                // Must be a public key
                if (getPublicKey()) {
                  respond('I already have a public key. Please remove it from the server manually before generating a new one.');
                } else {
                  o.onNext([e.data, respond]);
                }
              } else {
                jwt.verify(e.data, getPublicKey(), { algorithms: ['RS512'] }, function (err, data) {
                  if (err || !valid([data.jit, data.exp])) {
                    return o.onError(err || new Error('Invalid jit'));
                  }
                  o.onNext([data, respond]);
                });
              }
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

var valid = function () {
  var cache = [];
  return function (nEl) {
    cache = cache.filter(function (el) {
      return el[1] > getTime();
    });
    return !(cache.findIndex(function (el) {
      return el[0] === nEl;
    }) > -1);
  };
}();