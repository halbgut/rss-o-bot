const Rx = require('rx')
const { Observable: O } = Rx
const R = require('ramda')
const debug = require('debug')('rss-o-bot')

module.exports = (H, {
  throwO,
  PUBLIC_KEY_ALREADY_EXISTS,
  LOCAL_ONLY_COMMAND_ON_SERVER,
  NO_DATA_IN_REQUEST,
  UNKNOWN_COMMAND,
  FAILED_TO_SAVE_PUB_KEY
}) => {
  const savePublicKey = (config, publicKey) => newPublicKey =>
    Rx.if(
      () => publicKey,
      O.throw({ error: PUBLIC_KEY_ALREADY_EXISTS }),
      H.writeFile(H.publicKeyPath(config), newPublicKey)
    )
  const executeCommand = (state, commands) => ({ command, args }) =>
    R.cond([
      [R.equals(H.serverStartup), () => O.of('Server started!')],
      [R.T, ({ command, args }) => {
        debug(`Executing command ${command}`)
        const cState = H.setCommandState(state)(
          H.findCommand(commands, command, args)
        )
        if (!cState.get('command')) return throwO(UNKNOWN_COMMAND)
        return (
          cState.get('localOnly') && command !== 'ping'
            ? throwO(LOCAL_ONLY_COMMAND_ON_SERVER)
            : cState.get('command')(state)
        )
      }]
    ])

  const Server = {
    run: commands => state => publicKey =>
      H.httpServer(state.getIn(['configuration', 'port']))
        .flatMap(([data, respond]) =>
          R.ifElse(
            R.anyPass(R.not, R.pipe(R.length, R.lt(1))),
            O.throw({ error: NO_DATA_IN_REQUEST }),
            (data) =>
              R.cond(
                [
                  H.isString,
                  savePublicKey(state.get('configuration'), publicKey)
                ],
                [
                  R.where({
                    command: H.is('string'),
                    args: R.allPass([H.is('array'), R.all(H.is('string'))])
                  }),
                  R.pipe(H.verifyToken(publicKey), executeCommand(state))
                ],
                [R.T, O.throw({ error: NO_DATA_IN_REQUEST })]
              )(data)
              .flatMap(R.pipe(R.objOf('output'), respond(200)))
          )
          .catch(R.pipe(
            R.objOf('error'),
            respond(500)
          ))
        )
  }

  return Server
}

