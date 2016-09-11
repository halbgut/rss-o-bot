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
  var i = 0;
  var genKeysBound = function genKeysBound(config) {
    var privateKeyPath = H.privateKeyPath(config);
    var publicKeyPath = H.publicKeyPath(config);
    return H.exec('openssl genrsa 4096 -outform PEM').do(function () {
      return debug('Tried to generate RSA private key');
    }).flatMap(H.isFile(privateKeyPath).catch(function () {
      return Errors.throwO(Errors.FAILED_TO_GEN_PRIV_KEY);
    })).doOnError(function (err) {
      return console.log(err);
    }).flatMap(H.exec('openssl rsa -pubout -in ' + privateKeyPath)).flatMap(function (k) {
      return console.log('writting to ' + privateKeyPath + ': ' + k) || H.writeFile(privateKeyPath, k);
    }).flatMap(function (k) {
      return H.writeFile(publicKeyPath, k);
    }).flatMap(H.isFile(privateKeyPath).catch(function () {
      return Errors.throwO(Errors.FAILED_TO_GEN_PUB_KEY);
    })).do(function () {
      return debug('Generated keypair.');
    }).catch(function (err) {
      return ++i > 1 ? O.throw(err) : genKeysBound(config);
    });
  };
  return genKeysBound;
};

module.exports = genKeys;