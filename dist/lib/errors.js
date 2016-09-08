'use strict';

var R = require('ramda');

var _require = require('rx');

var O = _require.Observable;


var Errors = {
  NO_PRIVATE_KEY_FOUND: 'NO_PRIVATE_KEY_FOUND',
  NO_REMOTE_CONFIGURED: 'NO_REMOTE_CONFIGURED',
  messages: {
    NO_PRIVATE_KEY_FOUND: 'No private key found please generate a keypair first using `rss-o-bot gen-keys` (see manual for more details).',
    NO_REMOTE_CONFIGURED: 'No server configured, running in local mode. Check the configuration section of the man-page for more info.'
  },
  tranlate: function tranlate(error) {
    return Errors.messages[error.message];
  },
  log: function log(error) {
    return console.error(Errors.translate(error));
  },
  throw: function _throw(error) {
    throw Errors.create(error);
  },
  create: function create(error) {
    return new Error(error);
  },
  throwO: function throwO(error) {
    return R.pipe(Error.create, Errors.throw);
  }
};

module.exports = Errors;