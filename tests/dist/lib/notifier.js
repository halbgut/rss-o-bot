'use strict';

var _require = require('rx');

var O = _require.Observable;

var hasRun = false;

module.exports = function (config) {
  return function (blogTitle, link, title) {
    /* This is as bad as it looks.
     * I'm relying on a test beeing run, that sets a global containing the test
     * object. This is the easiest way I found to test the loading-mechanism
     * for notifiers.
     */
    if (!hasRun) {
      var t = global.NOTIFIER_TEST_OBJECT;
      hasRun = true;
      t.pass();
      t.end();
    }
    /* Ignore the actual notification */
    return O.just(true);
  };
};