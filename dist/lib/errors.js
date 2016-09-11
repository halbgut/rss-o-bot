'use strict';

var _require = require('rx');

var O = _require.Observable;


var create = function create(error) {
  return new Error(error);
};

var Errors = {
  NO_PRIVATE_KEY_FOUND: 'NO_PRIVATE_KEY_FOUND',
  NO_REMOTE_CONFIGURED: 'NO_REMOTE_CONFIGURED',
  NO_DATA_IN_REQUEST: 'NO_DATA_IN_REQUEST',
  UNKNOWN_COMMAND: 'UNKNOWN_COMMAND',
  FAILED_TO_GEN_PRIV_KEY: 'FAILED_TO_GEN_PRIV_KEY',
  FAILED_TO_GEN_PUB_KEY: 'FAILED_TO_GEN_PUB_KEY',
  FAILED_TO_SAVE_PUB_KEY: 'FAILED_TO_SAVE_PUB_KEY',
  PUBLIC_KEY_ALREADY_EXISTS: 'PUBLIC_KEY_ALREADY_EXISTS',
  LOCAL_ONLY_COMMAND_ON_SERVER: 'LOCAL_ONLY_COMMAND_ON_SERVER',
  messages: {
    NO_PRIVATE_KEY_FOUND: 'No private key found please generate a keypair first using `rss-o-bot gen-keys` (see manual for more details).',
    NO_REMOTE_CONFIGURED: 'No server configured, running in local mode. Check the configuration section of the man-page for more info.',
    NO_DATA_IN_REQUEST: 'Request failed! No data trasmitted to server.',
    UNKNOWN_COMMAND: 'Unkonwn command.',
    FAILED_TO_GEN_PRIV_KEY: 'Failed to generate private key using Openssl.',
    FAILED_TO_GEN_PUB_KEY: 'Failed to generate public key using Openssl.',
    FAILED_TO_SAVE_PUB_KEY: 'Unable to save public key',
    PUBLIC_KEY_ALREADY_EXISTS: 'I already have a public key. Please remove it from the server manually before generating a new one.',
    LOCAL_ONLY_COMMAND_ON_SERVER: 'Local-only command can\'t be executed on a server'
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
  throwO: function throwO(err) {
    return O.throw(create(err));
  },
  translate: function translate(err) {
    return Errors.messages[err] || err;
  },
  create: create
};

module.exports = Errors;