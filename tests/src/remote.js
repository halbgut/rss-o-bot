const fs = require('fs')

const { test } = require('ava')
const R = require('ramda')
const { Observable: O } = require('rx')
const Immutable = require('immutable')

const T = require('./lib/helpers')

const H = require('../../dist/lib/helpers')
const genKeys = require('../../dist/lib/genKeys')(H)

const config = { mode: 'remote', remote: 'ws://localhost', port: 3646 }

test.before.cb(t => {
  const location = `${__dirname}/../config/server-remote`
  genKeys(Immutable.Map({ location }))
  T.startServer(config.port, location, test)
    .do(() => t.end())
    .subscribe(() => {})
})

const genKeysConfig = R.merge(config, {port: 3647, location: `${__dirname}/../config/client-gen-keys`})
const genKeysServerConfig = R.merge(config, {port: 3647, location: `${__dirname}/../config/server-gen-keys`})
test.cb('genKeys', t => {
  T.startServer(genKeysServerConfig.port, genKeysServerConfig.location)
    .do(() =>
      T.run(['gen-keys'], 3)((t, o) =>
        o.last().flatMap(O.combineLatest(
          H.readFile(`${genKeysConfig.location}/priv.pem`),
          H.readFile(`${genKeysConfig.location}/pub.pem`),
          H.readFile(`${genKeysServerConfig.location}/pub.pem`)
        ))
          .do(([ privateK, publicK, serverPublicK ]) => {
            t.truthy(privateK)
            t.truthy(publicK)
            t.is(R.difference(publicK, serverPublicK).length, 0)
            /*  cleanup */
            fs.unlinkSync(`${genKeysConfig.location}/priv.pem`)
            fs.unlinkSync(`${genKeysConfig.location}/pub.pem`)
            fs.unlinkSync(`${genKeysServerConfig.location}/pub.pem`)
          }),
        genKeysConfig
      )(t)
    )
    .subscribe(
      R.T,
      console.error
    )
})

test.cb('ping/pong', T.run(['ping'])(
  (t, o) => {
    setTimeout(() => {
      t.fail('Time out')
      t.end()
    }, 2000)
    return o.tap(console.log)
  },
  config
))

