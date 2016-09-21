const { Observable: O } = require('rxjs/Rx')

module.exports = H => ({
  send: (privateKey, url, insecure = false) => message =>
    (
      insecure
        ? O.of(message)
        : H.signJwt(privateKey)(message)
    )
    .flatMap(H.httpPost(url))
})

