const cp = require('child_process')
const fs = require('fs')
const debug = require('debug')('rss-o-bot')

module.exports = H => config => {
  /**
   * OS specific approach. Works on MacOS but probably not
   * on Windows. It probably also works on Linux. If this doesn't
   * work, the RSA keys must be generated manualy.
   */
  const privKey = cp.execSync('openssl genrsa 4096 -outform PEM')
  const privateKeyPath = H.privateKeyPath(config)
  fs.writeFileSync(privateKeyPath, privKey)
  const pubKey = cp.execSync(`openssl rsa -pubout -in ${privateKeyPath}`)
  fs.writeFileSync(H.publicKeyPath(config), pubKey)
  debug('Generated key pair')
}

