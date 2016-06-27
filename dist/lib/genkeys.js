'use strict';

var _require = require('./helpers.js');

var setPublicKey = _require.setPublicKey;
var setPrivateKey = _require.setPrivateKey;
var privateKeyPath = _require.privateKeyPath;

var cp = require('child_process');

module.exports = function () {
  /**
   * OS specific approach. Works on MacOS but probably not
   * on Windows. It might also work on Linux. If this doesn't
   * work, the RSA keys must be generated manualy.
   */
  var privKey = cp.execSync('openssl genrsa 4096 -outform PEM');
  setPrivateKey(privKey);
  var pubKey = cp.execSync('openssl rsa -pubout -in ' + privateKeyPath);
  setPublicKey(pubKey);
};