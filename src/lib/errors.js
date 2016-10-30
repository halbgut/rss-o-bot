const { Observable: O } = require('rxjs/Rx')
const debug = require('debug')('rss-o-bot')

const Errors = {
  tranlate: error => Errors.debug((Errors[error.message] || Errors['UNKNOWN']))(error),
  debug: generator => error => {
    debug(error)
    return generator(error.meta)
  },
  log: error => console.error(Errors.translate(error)),
  throw: (error, meta) => { throw Errors.create(error, meta) },
  throwO: (error, meta) => O.throw(Errors.create(error, meta)),
  translate: err => Errors.messages[err] || err,
  create: (error, meta = {}) => {
    const err = new Error(Errors[error])
    return Object.assign(err, meta)
  },
  NO_DATA_IN_REQUEST: () => 'Request failed! No data trasmitted to server.',
  UNKNOWN_COMMAND: ({ command }) => `Unkonwn command: ${command}`,
  FAILED_TO_GEN_PRIV_KEY: () => 'Failed to generate private key using Openssl.',
  FAILED_TO_GEN_PUB_KEY: () => 'Failed to generate public key using Openssl.',
  FAILED_TO_SAVE_PUB_KEY: () => 'Unable to save public key',
  PUBLIC_KEY_ALREADY_EXISTS: () => `I already have a public key. Please remove it from the server manually before generating a new one. ()`,
  LOCAL_ONLY_COMMAND_ON_SERVER: ({ command }) => `Local-only command, "${command}", can't be executed on a server`,
  INVALID_URL: 'Invalid URL given.',
  INVALID_FEED: 'Feed is not a vaild RSS-Feed or a valid Atom-Feed.',
  NO_SUCH_COMMAND: 'No such command.',
  INVALID_JWT: 'Invalid token sent to server.',
  UNKNOWN: 'An unknown error occured. Run the command again with the `DEBUG=rss-o-bot` infront to get some more info.'
}

module.exports = Errors

