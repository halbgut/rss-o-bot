const {getConfig} = require('./helpers.js')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

module.exports = {
  genKeys () {
    const ecdh = crypto.createECDH('secp521r1')
    const pub = ecdh.generateKeys()
    const priv = ecdh.getPrivateKey('base64')
    fs.writeFileSync(path.normalize(`${getConfig('location')}/pub.key`), pub)
    fs.writeFileSync(path.normalize(`${getConfig('location')}/priv.key`), priv)
  }
}

