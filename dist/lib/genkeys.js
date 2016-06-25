'use strict';

var _require = require('./helpers.js');

var getConfig = _require.getConfig;

var cp = require('child_process');
var fs = require('fs');
var path = require('path');

module.exports = {
  genKeys: function genKeys() {
    /**
     * OS specific approach. Works on MacOS but probably not
     * on Windows. It might also work on Linux. If this doesn't
     * work, the RSA keys must be generated manualy.
     */
    var privPath = path.normalize(getConfig('location') + '/priv.pem');
    var pubPath = path.normalize(getConfig('location') + '/pub.pem');

    var privKey = cp.execSync('openssl genrsa 4096 -outform PEM');
    fs.writeFileSync(privPath, privKey);

    var pubKey = cp.execSync('openssl rsa -pubout -in ' + privPath);
    fs.writeFileSync(pubPath, pubKey);
  }
};