const {setPublicKey, setPrivateKey, privateKeyPath} = require('./helpers.js')
const cp = require('child_process')

module.exports = () => {
  /**
   * OS specific approach. Works on MacOS but probably not
   * on Windows. It might also work on Linux. If this doesn't
   * work, the RSA keys must be generated manualy.
   */
  const privKey = cp.execSync('openssl genrsa 4096 -outform PEM')
  setPrivateKey(privKey)
  const pubKey = cp.execSync(`openssl rsa -pubout -in ${privateKeyPath}`)
  setPublicKey(pubKey)
}

