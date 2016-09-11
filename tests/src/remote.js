const fs = require('fs')

const { test } = require('ava')
const R = require('ramda')
const { Observable: O } = require('rx')
const Immutable = require('immutable')

const T = require('./lib/helpers')

const H = require('../../dist/lib/helpers')
const Errors = require('../../dist/lib/errors')
const genKeys = require('../../dist/lib/gen-keys')(H, Errors)

const config = { mode: 'remote', remote: 'ws://localhost', port: 3646, location: `${__dirname}/../config/server-remote` }

test.before.cb(t => {
  genKeys(Immutable.Map(config))
    .flatMap(() => T.startServer(config.port, config.location, test))
    .do(() => t.end())
    .subscribe(
      () => {},
      err => {
        t.fail(err)
      }
    )
})

test.cb('genKeys', t => {
  const genKeysConfig = R.merge(config, {port: 3647, location: `${__dirname}/../config/client-gen-keys`})
  const genKeysServerConfig = R.merge(config, {port: 3647, location: `${__dirname}/../config/server-gen-keys`})
  T.startServer(genKeysServerConfig.port, genKeysServerConfig.location)
    .do(() =>
      T.run(['gen-keys'], 3)((t, o) =>
        o.flatMap(() => O.combineLatest(
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
    return o.do(() => t.pass())
  },
  R.assoc('remote', 'ws://localhost', config)
))

