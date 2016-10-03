/**
 * ObservableOperators
 * Attaches helper operators to the passed `Observable`s prototype
 */
const { Observable: O } = require('rxjs')

module.exports = (Observable: O) => {
  Observable.onErrorResumeNextT = (...observables) =>
    O.onErrorResumeNext(...observables)
      .defaultIfEmpty(false)
      .flatMap(x => x
        ? O.of(x)
        : O.throw()
      )
  Observable.prototype.log = function (str) {
    return this.do(x => console.log(str || x))
  }
}

