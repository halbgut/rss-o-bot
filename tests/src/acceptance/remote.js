const fs = require('fs')

const { test } = require('ava')
const R = require('ramda')
const { Observable: O } = require('rxjs/Rx')
const Immutable = require('immutable')

const T = require('./lib/helpers')

const H = require('../../../dist/lib/helpers')
const Errors = require('../../../dist/lib/errors')
const genKeys = require('../../../dist/lib/gen-keys')(H, Errors)

const config = { mode: 'remote', remote: 'localhost', port: 3646, location: `${__dirname}/../../config/server-remote` }

test.before.cb(t => {
  genKeys(Immutable.Map(config))
    .switchMap(() => T.startServer(config.port, config.location, test))
    .do(() => t.end())
    .subscribe(
      () => {},
      err => {
        t.fail(err)
      }
    )
})

test.cb('genKeys', t => {
  const genKeysConfig = R.merge(config, {port: 3647, location: `${__dirname}/../../config/client-gen-keys`})
  const genKeysServerConfig = R.merge(config, {port: 3647, location: `${__dirname}/../../config/server-gen-keys`})
  T.startServer(genKeysServerConfig.port, genKeysServerConfig.location)
    .do(() =>
      T.run(['gen-keys'], 4)((t, o) =>
        o
          .do(x => t.is(x, 'Keys generated and public key transmitted to server.'))
          .switchMap(() => O.combineLatest(
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
    return o.filter(R.propEq('output', 'pong')).do(() => t.pass())
  },
  R.assoc('remote', 'localhost', config)
))

