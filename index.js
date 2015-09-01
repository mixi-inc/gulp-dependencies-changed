var highland = require('highland');
var lib = require('./lib/deps_changed_stream.js');

function depsChanged(opts) {
  var fullyOpts = highland.extend(opts || {}, defaultOptions);

  // Drop DI parameter.
  return lib.createDependenciesChangedStream(fullyOpts);
}

var defaultOptions = {
  comparator: lib.compareByMtime,
  pathResolver: lib.relativeResolver,
  debug: false,
};

depsChanged.compareByMtime = lib.compareByMtime;
depsChanged.relativeResolver = lib.relativeResolver;

module.exports = depsChanged;
