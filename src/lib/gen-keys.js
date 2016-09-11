const debug = require('debug')('rss-o-bot')
const { Observable: O } = require('rx')

/**
 * OS specific approach. Works on MacOS but probably not
 * on Windows. It probably also works on Linux. If this doesn't
 * work, the RSA keys must be generated manualy.
 */
const genKeys = (H, Errors) => config => {
  const privateKeyPath = H.privateKeyPath(config)
  const publicKeyPath = H.publicKeyPath(config)
  return (
    H.exec(`openssl genrsa -out ${privateKeyPath} 4096`)
      .delay(100)
      .do(() => debug('Tried to generate RSA private key'))
      .flatMap(() => H.isFile(privateKeyPath).catch(err => {
        debug(err)
        return Errors.throwO(Errors.FAILED_TO_GEN_PRIV_KEY)
      }))
      .flatMap(() => H.exec(`openssl rsa -pubout -in ${privateKeyPath} -out ${publicKeyPath}`))
      .flatMap(() => H.isFile(publicKeyPath).catch(err => {
        debug(err)
        return Errors.throwO(Errors.FAILED_TO_GEN_PUB_KEY)
      }))
      .do(() => debug('Generated keypair.'))
      .catch(err => O.throw(err).delay(1000))
      .retry(2)
  )
}

module.exports = genKeys

