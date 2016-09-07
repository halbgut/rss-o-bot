'use strict';

var _require = require('child_process');

var spawn = _require.spawn;

var _require2 = require('ava');

var test = _require2.test;


var server = void 0;

test.cb('start a server', function (t) {
  /* Spawn in non-testing mode */
  server = spawn('bash', ['-c', 'RSS_O_BOT_TESTING_MODE= ../../dist/cli.js run --config=' + __dirname + '/../config/server']);
  t.plan(1);
  server.stderr.on('data', function (out) {
    console.error(out.toString());
  });
  server.stdout.on('data', function (out) {
    var outStr = out.toString();
    if (outStr === 'Server started!\n') {
      /* Server successfully started */
      t.pass();
      setTimeout(function () {
        server.kill();
        t.end();
      }, 2000);
    } else {
      console.log(outStr);
    }
  });
  server.on('error', function (err) {
    console.error(err);
    t.fail();
  });
  server.on('close', function (e) {
    t.end();
  });
});