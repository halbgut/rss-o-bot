const { spawn } = require('child_process')
const { test } = require('ava')

let server

test.cb('start a server', t => {
  /* Spawn in non-testing mode */
  server = spawn('bash', ['-c', `RSS_O_BOT_TESTING_MODE= node --trace-deprecation ../../dist/cli.js run --config=${__dirname}/../config/server`])
  t.plan(1)
  server.stderr.on('data', out => {
    console.error(out.toString())
  })
  server.stdout.on('data', out => {
    const outStr = out.toString()
    if (outStr.includes('Succssfully started server.')) {
      /* Server successfully started */
      t.pass()
      server.kill()
      t.end()
    } else {
      console.log(outStr)
    }
  })
  server.on('error', err => {
    console.error(err)
    t.fail()
  })
  server.on('close', e => {
    t.end()
  })
})

