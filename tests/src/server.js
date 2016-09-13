const { spawn } = require('child_process')
const { test } = require('ava')

const H = require('../../dist/lib/helpers')

let server

test.cb('start a server', t => {
  /* Spawn in non-testing mode */
  server = spawn('bash', ['-c', `RSS_O_BOT_TESTING_MODE= ../../dist/cli.js run --config=${__dirname}/../config/server`])
  t.plan(1)
  server.stderr.on('data', out => {
    console.error(out.toString())
  })
  server.stdout.on('data', out => {
    const outStr = out.toString()
    if (outStr === 'Symbol(startup)\n') {
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

