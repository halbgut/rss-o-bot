'use strict';

var uuid = require('node-uuid');
var WebSocket = require('faye-websocket');
var jwt = require('jsonwebtoken');

var _require = require('rx');

var O = _require.Observable;

var debug = require('debug')('rss-o-bot');

var JWT_EXPIRATION = 60; // Sixty seconds default JWT expiration time

module.exports = function (H) {
  return {
    send: function send(url, message, insecure) {
      return function (privateKey) {
        return O.create(function (o) {
          var ws = new WebSocket.Client(url);
          debug('Opening socket');
          ws.on('open', function () {
            debug('Socket has been opened');
            // Should be a GPG public key
            if (insecure) {
              ws.send(message);
            } else {
              jwt.sign(Object.assign(message, { exp: H.getTime(JWT_EXPIRATION), jti: uuid.v4() }), privateKey, { algorithm: 'RS512' }, function (err, token) {
                if (err) return o.onError(err);
                ws.send(token);
              });
            }
          });
          ws.on('message', function (e) {
            return o.onNext(e.data);
          });
          ws.on('error', function (err) {
            return o.onError(err);
          });
          ws.on('close', function () {
            return o.onCompleted();
          });
        });
      };
    }
  };
};