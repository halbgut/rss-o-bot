'use strict';

var cp = require('child_process');
var fs = require('fs');
var debug = require('debug')('rss-o-bot');

module.exports = function (H) {
  return function (config) {
    /**
     * OS specific approach. Works on MacOS but probably not
     * on Windows. It probably also works on Linux. If this doesn't
     * work, the RSA keys must be generated manualy.
     */
    var privKey = cp.execSync('openssl genrsa 4096 -outform PEM');
    var privateKeyPath = H.privateKeyPath(config);
    fs.writeFileSync(privateKeyPath, privKey);
    var pubKey = cp.execSync('openssl rsa -pubout -in ' + privateKeyPath);
    fs.writeFileSync(H.publicKeyPath(config), pubKey);
    debug('Generated key pair');
  };
};