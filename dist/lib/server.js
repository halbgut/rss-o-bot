'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var WebSocket = require('faye-websocket');
var jwt = require('jsonwebtoken');
var http = require('http');
var Rx = require('rx');
var debug = require('debug')('rss-o-bot');
var O = Rx.Observable;

var H = require('./helpers');

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
    if (e.data.indexOf('PUBLIC KEY') > -1) {
      // Must be a public key
      if (publicKey) {
        respond('I already have a public key. Please remove it from the server manually before generating a new one.');
      } else {
        /*  */
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
                ws.send(msg);
                ws.close();
                ws = null;
              };
              ws.on('message', verifyTokenAndCheckForPublicKey(o, respond));
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
    };
  },

  run: function run(commands) {
    return function (state) {
      var config = state.get('configuration');
      Server.listen(config).map(function (_ref) {
        var _ref2 = _slicedToArray(_ref, 2);

        var data = _ref2[0];
        var respond = _ref2[1];

        /* Must be a public key */
        if (typeof data === 'string') {
          debug('Recieved public key');
          return H.writeFile(H.publicKeyPath(config), data);
        } else {
          debug('Executing command ' + data.action);
          var cState = H.setCommandState(state)(H.findCommand(commands, data.action, data.args));
          if (cState.get('localOnly')) return O.throw(new Error('Local-only command can\'t be executed on a server'));
          return cState.get('command')(state);
        }
      });
    };
  }
};

module.exports = Server;