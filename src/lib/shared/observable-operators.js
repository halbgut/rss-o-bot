/**
 * ObservableOperators
 * Attaches helper operators to the passed `Observable`s prototype
 * @flow
 */
const { Observable: O } = require('rxjs')

module.exports = (Observable: typeof O) => {
  Observable.onErrorResumeNextT = (...observables) =>
    O.onErrorResumeNext(...observables)
      .defaultIfEmpty(false)
      .flatMap(x => x
        ? O.of(x)
        : O.throw()
      )
  Observable.prototype.log = function (str) {
    return this.do(
      x => console.log('next', str || x),
      x => console.log('error', x),
      () => console.log('complete')
    )
  }
}

