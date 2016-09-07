'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var Immutable = require('immutable');

var Argv = {
  extractArguments: function extractArguments(argv) {
    var _argv$slice$reduce = argv.slice(3).reduce(function (_ref, arg) {
      var _ref2 = _slicedToArray(_ref, 2);

      var args = _ref2[0];
      var switches = _ref2[1];
      return typeof arg === 'string' && arg.substr(0, 2) === '--' ? [args, switches.concat(arg.substr(2))] : [args.concat(arg), switches];
    }, [[], []]);

    var _argv$slice$reduce2 = _slicedToArray(_argv$slice$reduce, 2);

    var args = _argv$slice$reduce2[0];
    var rawSwitches = _argv$slice$reduce2[1];

    var switches = rawSwitches.reduce(function (map, _switch) {
      var split = _switch.split('=');
      return split.length === 1 ? map.set(split[0], true) : map.set(split[0], split[1]);
    }, Immutable.Map({}));
    return Immutable.fromJS({ action: argv[2], arguments: args, switches: switches });
  }
};

module.exports = Argv;