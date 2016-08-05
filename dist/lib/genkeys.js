'use strict';

var cp = require('child_process');

module.exports = function (H) {
  /**
   * OS specific approach. Works on MacOS but probably not
   * on Windows. It might also work on Linux. If this doesn't
   * work, the RSA keys must be generated manualy.
   */
  var privKey = cp.execSync('openssl genrsa 4096 -outform PEM');
  H.setPrivateKey(privKey);
  var pubKey = cp.execSync('openssl rsa -pubout -in ' + H.privateKeyPath);
  H.setPublicKey(pubKey);
};