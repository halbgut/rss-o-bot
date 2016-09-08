'use strict';

var _require = require('child_process');

var spawn = _require.spawn;

var _require2 = require('ava');

var test = _require2.test;


var T = require('./lib/helpers');

var DEBUG = process.env.DEBUG;
var config = { mode: 'remote', remote: 'ws://localhost', port: 3646 };
var server = void 0;

test.before.cb(function (t) {
  server = spawn('bash', ['-c', 'DEBUG=' + DEBUG + ' RSS_O_BOT_TESTING_MODE= ../../dist/cli.js run --mode=server --config=' + __dirname + '/../config/server-remote --port=' + config.port]);
  server.stderr.on('data', function (out) {
    console.error(out.toString());
  });
  server.stdout.on('data', function (out) {
    if (out.toString() === 'Server started!\n') t.end();
  });
});

test.after.always(function () {
  server.kill();
});

test.cb('ping/pong', T.run(['ping'])(function (t, o) {
  setTimeout(function () {
    t.fail('Time out');
    t.end();
  }, 2000);
  return o.tap(console.log);
}, config));