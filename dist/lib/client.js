'use strict';

var _require = require('./helpers');

var getConfig = _require.getConfig;
var getTime = _require.getTime;

var uuid = require('node-uuid');
var WebSocket = require('faye-websocket');
var jwt = require('jsonwebtoken');
var Rx = require('rx');
var O = Rx.Observable;

module.exports = {
  send: function send(url, message) {
    return O.create(function (o) {
      var ws = new WebSocket.Client(url);
      ws.on('open', function () {
        jwt.sign(Object.assign(message, { exp: getTime(getConfig('jwt-expiration')), jti: uuid.v4() }), getConfig('remote-key'), {}, function (err, token) {
          if (err) return o.onError(err);
          ws.send(token);
        });
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