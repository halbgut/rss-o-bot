const { spawn } = require('child_process')
const { test } = require('ava')

const T = require('./lib/helpers')

const DEBUG = process.env.DEBUG
const config = { mode: 'remote', remote: 'ws://localhost', port: 3646 }
let server

test.before.cb(t => {
  server = spawn('bash', ['-c', `DEBUG=${DEBUG} RSS_O_BOT_TESTING_MODE= ../../dist/cli.js run --mode=server --config=${__dirname}/../config/server-remote --port=${config.port}`])
  server.stderr.on('data', out => {
    console.error(out.toString())
  })
  server.stdout.on('data', out => {
    if (out.toString() === 'Server started!\n') t.end()
    console.log(out.toString())
  })
})

test.after.always(() => {
  server.kill()
})

test.cb('ping/pong', T.run(['ping'])(
  (t, o) => {
    setTimeout(t.fail.bind(t), 2000)
    return o.tap(console.log)
  },
  config
))

