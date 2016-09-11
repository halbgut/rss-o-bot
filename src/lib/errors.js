const { Observable: O } = require('rx')

const create = error => new Error(error)

const Errors = {
  NO_PRIVATE_KEY_FOUND: 'NO_PRIVATE_KEY_FOUND',
  NO_REMOTE_CONFIGURED: 'NO_REMOTE_CONFIGURED',
  PUBLIC_KEY_ALREADY_EXISTS: 'I already have a public key. Please remove it from the server manually before generating a new one.',
  LOCAL_ONLY_COMMAND_ON_SERVER: 'Local-only command can\'t be executed on a server',
  messages: {
    NO_PRIVATE_KEY_FOUND: 'No private key found please generate a keypair first using `rss-o-bot gen-keys` (see manual for more details).',
    NO_REMOTE_CONFIGURED: 'No server configured, running in local mode. Check the configuration section of the man-page for more info.',
    NO_DATA_IN_REQUEST: 'Request failed! No data trasmitted to server.',
    UNKNOWN_COMMAND: 'Unkonwn command.',
    FAILED_TO_GEN_PRIV_KEY: 'Failed to generate private key using Openssl.',
    FAILED_TO_GEN_PUB_KEY: 'Failed to generate public key using Openssl.'
  },
  tranlate: error => Errors.messages[error.message],
  log: error => console.error(Errors.translate(error)),
  throw: error => { throw Errors.create(error) },
  throwO: err => O.throw(create(err)),
  translate: err => Errors[err] || err,
  create
}

module.exports = Errors

