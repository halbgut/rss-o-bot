const { spawn } = require('child_process')

const { test } = require('ava')
// const { Observable: O } = require('rx')

// const T = require('./lib/helpers')

let server

test.cb('start a server', t => {
  /* Spawn in non-testing mode */
  server = spawn('bash', ['-c', 'RSS_O_BOT_TESTING_MODE= ../../dist/cli.js run --server'])
  t.plan(1)
  server.stderr.on('data', out => {
    console.error(out.toString())
  })
  server.stdout.on('data', out => {
    const outStr = out.toString()
    if (outStr === 'Server started!\n') {
      /* Server successfully started */
      t.pass()
      setTimeout(() => {
        server.kill()
        t.end()
      }, 2000)
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

