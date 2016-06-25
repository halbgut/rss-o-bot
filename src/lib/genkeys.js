const {getConfig} = require('./helpers.js')
const cp = require('child_process')
const fs = require('fs')
const path = require('path')

module.exports = {
  genKeys () {
    /**
     * OS specific approach. Works on MacOS but probably not
     * on Windows. It might also work on Linux. If this doesn't
     * work, the RSA keys must be generated manualy.
     */
    const privPath = path.normalize(`${getConfig('location')}/priv.pem`)
    const pubPath = path.normalize(`${getConfig('location')}/pub.pem`)

    const privKey = cp.execSync('openssl genrsa 4096 -outform PEM')
    fs.writeFileSync(privPath, privKey)

    const pubKey = cp.execSync(`openssl rsa -pubout -in ${privPath}`)
    fs.writeFileSync(pubPath, pubKey)
  }
}

