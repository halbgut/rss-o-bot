'use strict';

var debug = require('debug')('rss-o-bot');

var _require = require('rx');

var O = _require.Observable;

/**
 * OS specific approach. Works on MacOS but probably not
 * on Windows. It probably also works on Linux. If this doesn't
 * work, the RSA keys must be generated manualy.
 */

var genKeys = function genKeys(H, Errors) {
  return function (config) {
    var privateKeyPath = H.privateKeyPath(config);
    var publicKeyPath = H.publicKeyPath(config);
    return H.exec('openssl genrsa 4096 -outform PEM').do(function () {
      return debug('Tried to generate RSA private key');
    }).flatMap(function (k) {
      return H.writeFile(privateKeyPath, k[0]);
    }).flatMap(function () {
      return H.isFile(privateKeyPath).catch(function (err) {
        debug(err);
        return Errors.throwO(Errors.FAILED_TO_GEN_PRIV_KEY);
      });
    }).flatMap(function () {
      return H.exec('openssl rsa -pubout -in ' + privateKeyPath);
    }).flatMap(function (k) {
      return H.writeFile(publicKeyPath, k[0]);
    }).flatMap(function () {
      return H.isFile(publicKeyPath).catch(function (err) {
        debug(err);
        return Errors.throwO(Errors.FAILED_TO_GEN_PUB_KEY);
      });
    }).do(function () {
      return debug('Generated keypair.');
    }).catch(function (err) {
      return O.throw(err).delay(1000);
    }).retry(2);
  };
};

module.exports = genKeys;