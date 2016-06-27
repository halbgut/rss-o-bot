'use strict';

var _require = require('./helpers');

var getConfig = _require.getConfig;
var getTime = _require.getTime;
var getPrivateKey = _require.getPrivateKey;

var uuid = require('node-uuid');
var WebSocket = require('faye-websocket');
var jwt = require('jsonwebtoken');
var Rx = require('rx');
var O = Rx.Observable;
var debug = require('debug')('rss-o-bot');

module.exports = {
  send: function send(message, insecure) {
    return O.create(function (o) {
      var ws = new WebSocket.Client(getConfig('remote'));
      debug('Opening socket');
      ws.on('open', function () {
        debug('Socket has been opened');
        if (insecure) {
          console.log(message);
          ws.send(message);
        } else {
          jwt.sign(Object.assign(message, { exp: getTime(getConfig('jwt-expiration')), jti: uuid.v4() }), getPrivateKey(), { algorithm: 'RS512' }, function (err, token) {
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
  }
};