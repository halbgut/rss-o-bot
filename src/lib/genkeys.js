const debug = require('debug')('rss-o-bot')
const {Observable: O} = require('rx')

/**
 * OS specific approach. Works on MacOS but probably not
 * on Windows. It probably also works on Linux. If this doesn't
 * work, the RSA keys must be generated manualy.
 */
const genKeys = (H, Errors) => {
  let i = 0
  const genKeysBound = config => {
    const privateKeyPath = H.privateKeyPath(config)
    const publicKeyPath = H.publicKeyPath(config)
    return (
      H.exec('openssl genrsa 4096 -outform PEM')
        .do(() => debug('Tried to generate RSA private key'))
        .flatMap(H.isFile(privateKeyPath).catch(() => Errors.throwO(Errors.FAILED_TO_GEN_PRIV_KEY)))
        .doOnError(err => console.log(err))
        .flatMap(H.exec(`openssl rsa -pubout -in ${privateKeyPath}`))
        .flatMap(k => console.log(`writting to ${privateKeyPath}: ${k}`) || H.writeFile(privateKeyPath, k))
        .flatMap(k => H.writeFile(publicKeyPath, k))
        .flatMap(H.isFile(privateKeyPath).catch(() => Errors.throwO(Errors.FAILED_TO_GEN_PUB_KEY)))
        .do(() => debug('Generated keypair.'))
        .catch(err => ++i > 1 ? O.throw(err) : genKeysBound(config))
    )
  }
  return genKeysBound
}

module.exports = genKeys

