const debug = require('debug')('rss-o-bot')

/**
 * OS specific approach. Works on MacOS but probably not
 * on Windows. It probably also works on Linux. If this doesn't
 * work, the RSA keys must be generated manualy.
 */
const genKeys = (H, Errors) => config => {
  const privateKeyPath = H.privateKeyPath(config)
  const publicKeyPath = H.publicKeyPath(config)
  return (
    H.exec('openssl genrsa 4096 -outform PEM')
      .do(() => debug('Tried to generate RSA private key'))
      .flatMap(k => H.writeFile(privateKeyPath, k))
      .flatMap(H.isFile(privateKeyPath).catch(() => Errors.throwO(Errors.FAILED_TO_GEN_PRIV_KEY)))
      .flatMap(H.exec(`openssl rsa -pubout -in ${privateKeyPath}`))
      .flatMap(k => H.writeFile(publicKeyPath, k))
      .flatMap(H.isFile(publicKeyPath).catch(() => Errors.throwO(Errors.FAILED_TO_GEN_PUB_KEY)))
      .do(() => debug('Generated keypair.'))
      .retry(2)
  )
}

module.exports = genKeys

