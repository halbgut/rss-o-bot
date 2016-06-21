'use strict';

var _require = require('./helpers.js');

var getConfig = _require.getConfig;

var crypto = require('crypto');
var fs = require('fs');
var path = require('path');

module.exports = {
  genKeys: function genKeys() {
    var ecdh = crypto.createECDH('secp521r1');
    var pub = ecdh.generateKeys();
    var priv = ecdh.getPrivateKey('base64');
    fs.writeFileSync(path.normalize(getConfig('location') + '/pub.key'), pub);
    fs.writeFileSync(path.normalize(getConfig('location') + '/priv.key'), priv);
  }
};