const R = require('ramda')
const { Observable: O } = require('rx')

const Errors = {
  NO_PRIVATE_KEY_FOUND: 'NO_PRIVATE_KEY_FOUND',
  NO_REMOTE_CONFIGURED: 'NO_REMOTE_CONFIGURED',
  messages: {
    NO_PRIVATE_KEY_FOUND: 'No private key found please generate a keypair first using `rss-o-bot gen-keys` (see manual for more details).',
    NO_REMOTE_CONFIGURED: 'No server configured, running in local mode. Check the configuration section of the man-page for more info.'
  },
  tranlate: error => Errors.messages[error.message],
  log: error => console.error(Errors.translate(error)),
  throw: error => { throw Errors.create(error) },
  create: error => new Error(error),
  throwO: R.pipe(Error.create, O.throw)
}

module.exports = Errors

