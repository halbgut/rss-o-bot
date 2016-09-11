'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var WebSocket = require('faye-websocket');
var jwt = require('jsonwebtoken');
var http = require('http');

var _require = require('rx');

var O = _require.Observable;

var debug = require('debug')('rss-o-bot');

var startup = Symbol('startup');

module.exports = function (H, _ref) {
  var throwO = _ref.throwO;
  var PUBLIC_KEY_ALREADY_EXISTS = _ref.PUBLIC_KEY_ALREADY_EXISTS;
  var LOCAL_ONLY_COMMAND_ON_SERVER = _ref.LOCAL_ONLY_COMMAND_ON_SERVER;
  var NO_DATA_IN_REQUEST = _ref.NO_DATA_IN_REQUEST;
  var UNKNOWN_COMMAND = _ref.UNKNOWN_COMMAND;
  var FAILED_TO_SAVE_PUB_KEY = _ref.FAILED_TO_SAVE_PUB_KEY;

  var isTokenValid = function () {
    var cache = [];
    return function (nEl) {
      cache = cache.filter(function (el) {
        return el[1] > H.getTime();
      });
      return !(cache.findIndex(function (el) {
        return el[0] === nEl;
      }) > -1);
    };
  }();

  var verifyTokenAndCheckForPublicKey = function verifyTokenAndCheckForPublicKey(o, respond, publicKey) {
    return function (e) {
      debug('Server receiving message');
      if (!e.data || e.data.length < 1) return respond(NO_DATA_IN_REQUEST);
      if (e.data.indexOf('PUBLIC KEY') > -1) {
        // Must be a public key
        if (publicKey) {
          respond({ error: PUBLIC_KEY_ALREADY_EXISTS });
        } else {
          o.onNext([e.data, respond]);
        }
      } else {
        jwt.verify(e.data, publicKey, { algorithms: ['RS512'] }, function (err, data) {
          if (err || !isTokenValid([data.jit, data.exp])) {
            return o.onError(err || new Error('Invalid jit'));
          }
          o.onNext([data, respond]);
        });
      }
    };
  };

  var Server = {
    listen: function listen(config) {
      return function (publicKey) {
        return O.create(function (o) {
          var port = config.get('port');
          http.createServer().on('upgrade', function (request, socket, body) {
            if (WebSocket.isWebSocket(request)) {
              (function () {
                var ws = new WebSocket(request, socket, body);
                var respond = function respond(msg) {
                  debug('Server sending response.');
                  ws.send(msg);
                  debug('Server closing socket.');
                  ws.close();
                  ws = null;
                };
                ws.on('message', function (e) {
                  return verifyTokenAndCheckForPublicKey(o, respond, publicKey)(e);
                });
                ws.on('error', function (err) {
                  ws.close();
                  ws = null;
                  o.onError(err);
                });
                ws.on('end', function () {
                  debug('Client closed socket.');
                  ws.close();
                  ws = null;
                  o.onCompleted();
                });
              })();
            }
          }).listen(port);
          /* Send the startup message */
          o.onNext([startup]);
          debug('Server started');
          return function () {
            debug('Server killed');
          };
        });
      };
    },

    run: function run(commands) {
      return function (state) {
        var config = state.get('configuration');
        debug('Starting server');
        return Server.listen(config)(state.get('publicKey')).flatMap(function (_ref2) {
          var _ref3 = _slicedToArray(_ref2, 2);

          var data = _ref3[0];
          var respond = _ref3[1];

          /* Just let it through if it's the start up message */
          if (data === startup) return O.of('Server started!');
          /* Must be a public key */
          if (typeof data === 'string') {
            debug('Recieved public key');
            return H.writeFile(H.publicKeyPath(config), data).catch(function () {
              respond({ error: FAILED_TO_SAVE_PUB_KEY });
              return O.of(FAILED_TO_SAVE_PUB_KEY);
            }).do(respond);
          } else {
            debug('Executing command ' + data.action);
            var cState = H.setCommandState(state)(H.findCommand(commands, data.action, data.args));
            if (!cState.get('command')) return throwO(UNKNOWN_COMMAND);
            return cState.get('localOnly') && data.action !== 'ping' ? throwO(LOCAL_ONLY_COMMAND_ON_SERVER) : cState.get('command')(state).do(respond);
          }
        });
      };
    }
  };

  return Server;
};