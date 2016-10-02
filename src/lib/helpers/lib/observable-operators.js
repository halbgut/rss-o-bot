/**
 * ObservableOperators
 * Attaches helper operators to the passed `Observable`s prototype
 */
const { Observable: O } = require('rxjs')

module.exports = (Observable: O) => {
  Observable.prototype.onErrorResumeNextT = function (o) {
    return this
      .defaultIfEmpty(false)
      .flatMap(x => x
        ? O.of(x)
        : o
      )
  }
}

