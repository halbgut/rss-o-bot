'use strict';

var Immutable = require('immutable');

var Argv = {
  extractArguments: function extractArguments(argv) {
    return Immutable.fromJS({ action: argv[2], arguments: argv.slice(2) });
  },
  applyModeFlags: function applyModeFlags(state) {
    var args = state.get('arguments');
    var modes = Immutable.List(['server', 'remote', 'local']);
    var newMode = args.filter(function (arg) {
      return modes.includes(arg.substr(2));
    }).first() || state.get('mode');
    return state.set('mode', newMode).update('arguments', function (args) {
      return args.filter(function (arg) {
        return !modes.includes(arg.substr(2));
      });
    });
  }
};

module.exports = Argv;