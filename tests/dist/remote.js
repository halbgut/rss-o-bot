'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var fs = require('fs');

var _require = require('ava');

var test = _require.test;

var R = require('ramda');

var _require2 = require('rx');

var O = _require2.Observable;

var Immutable = require('immutable');

var T = require('./lib/helpers');

var H = require('../../dist/lib/helpers');
var genKeys = require('../../dist/lib/genKeys')(H);

var config = { mode: 'remote', remote: 'ws://localhost', port: 3646 };

test.before.cb(function (t) {
  var location = __dirname + '/../config/server-remote';
  genKeys(Immutable.Map({ location: location }));
  T.startServer(config.port, location, test).do(function () {
    return t.end();
  }).subscribe(function () {});
});

var genKeysConfig = R.merge(config, { port: 3647, location: __dirname + '/../config/client-gen-keys' });
var genKeysServerConfig = R.merge(config, { port: 3647, location: __dirname + '/../config/server-gen-keys' });
test.cb('genKeys', function (t) {
  T.startServer(genKeysServerConfig.port, genKeysServerConfig.location).do(function () {
    return T.run(['gen-keys'], 3)(function (t, o) {
      return o.last().flatMap(O.combineLatest(H.readFile(genKeysConfig.location + '/priv.pem'), H.readFile(genKeysConfig.location + '/pub.pem'), H.readFile(genKeysServerConfig.location + '/pub.pem'))).do(function (_ref) {
        var _ref2 = _slicedToArray(_ref, 3);

        var privateK = _ref2[0];
        var publicK = _ref2[1];
        var serverPublicK = _ref2[2];

        t.truthy(privateK);
        t.truthy(publicK);
        t.is(R.difference(publicK, serverPublicK).length, 0);
        /*  cleanup */
        fs.unlinkSync(genKeysConfig.location + '/priv.pem');
        fs.unlinkSync(genKeysConfig.location + '/pub.pem');
        fs.unlinkSync(genKeysServerConfig.location + '/pub.pem');
      });
    }, genKeysConfig)(t);
  }).subscribe(R.T, console.error);
});

test.cb('ping/pong', T.run(['ping'])(function (t, o) {
  setTimeout(function () {
    t.fail('Time out');
    t.end();
  }, 2000);
  return o.tap(console.log);
}, config));