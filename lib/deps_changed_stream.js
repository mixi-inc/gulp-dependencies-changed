var highland = require('highland');
var vinylFs = require('vinyl-fs');
var path = require('path');


function createDependenciesChangedStream(opts, di) {
  var matcher = opts.matcher;
  var pathResolver = opts.pathResolver;
  var comparator = opts.comparator;

  return highland.pipeline(
    highland.flatMap(function(dependentVinylFile) {
      return highland([dependentVinylFile])
        .flatMap(collectDepending(matcher, pathResolver, di))
        .through(isIncludeNewerFilesThan(comparator, dependentVinylFile))
        .flatMap(function(hasNewerDependingFiles) {
          return hasNewerDependingFiles
            ? highland([dependentVinylFile])
            : highland([]);
        });
    })
  );
}


function isIncludeNewerFilesThan(comparator, baseVinylFile) {
  return function(vinylFileStream) {
    return vinylFileStream
      .filter(newerFilesThan(comparator, baseVinylFile))
      .collect()
      .map(function(newerDependentVinylFiles) {
        return newerDependentVinylFiles.length > 0;
      });
  };
}


function newerFilesThan(comparator, baseVinylFile) {
  return function(vinylFile) {
    return comparator(vinylFile, baseVinylFile);
  };
}


function compareByMtime(vinylFile, baseVinylFile) {
  return getMtime(vinylFile) > getMtime(baseVinylFile);
}


function getMtime(vinylFile) {
  return vinylFile.stat.mtime;
}


function collectDepending(matcher, pathResolver, di) {
  return function(vinylFile) {
    var fileContents = vinylFile.contents.toString('utf-8');
    var filePath = vinylFile.path;

    var unresolvedDependedFilePaths =
      parseDependedFilePaths(fileContents, matcher);

    var dependedFilePaths =
      unresolvedDependedFilePaths.map(pathResolver.bind(null, filePath));

    var dependedVinylFileStream = highland(dependedFilePaths)
      .flatMap(getAPI('createVinylFileStream', di));

    return dependedVinylFileStream
      .flatMap(collectDepending(matcher, pathResolver, di))
      .concat(dependedVinylFileStream.observe());
  };
}


function parseDependedFilePaths(fileContents, matcher) {
  var unresolvedDependedFilePaths = [];

  var matches;
  while ((matches = matcher.exec(fileContents)) !== null) {
    unresolvedDependedFilePaths.push(matches[1]);
  }

  return unresolvedDependedFilePaths;
}


function createVinylFileStream(filePath) {
  return highland(vinylFs.src(filePath));
}


function relativeResolver(dependentFilePath, dependedFilePath) {
  return path.resolve(path.dirname(dependentFilePath), dependedFilePath);
}


var DEFAULT_API = {
  createVinylFileStream: createVinylFileStream,
};


function getAPI(key, di) {
  return di && di[key] || DEFAULT_API[key];
}


module.exports = {
  createDependenciesChangedStream: createDependenciesChangedStream,
  collectDepending: collectDepending,
  compareByMtime: compareByMtime,
  relativeResolver: relativeResolver,
};
