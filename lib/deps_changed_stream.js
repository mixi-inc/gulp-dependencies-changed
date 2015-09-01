var highland = require('highland');
var lodash = require('lodash');
var vinylFs = require('vinyl-fs');
var path = require('path');


function createDependenciesChangedStream(opts, di) {
  var dest = opts.dest;
  var matcher = opts.matcher;
  var pathResolver = opts.pathResolver;
  var comparator = opts.comparator;
  var isDebugEnabled = opts.debug;

  return highland.pipeline(
    highland.flatMap(function(dependentVinylFile) {
      var srcVinylFilesStream = highland([dependentVinylFile])
        .flatMap(collectDependings(matcher, pathResolver, di))
        // Check also dependent file.
        .concat([dependentVinylFile])
        .collect()
        .pipe(debugRelatedFiles(isDebugEnabled, dependentVinylFile));

      var destFilePath = getDestAbsPath(dest, dependentVinylFile);
      var destVinylFileStream = getAPI('createVinylFileStream', di)(destFilePath);

      return highland.zip(
          destVinylFileStream,
          srcVinylFilesStream
        )
        .flatMap(composeDependentAndDependings())
        .filter(newerFilesThan(comparator))
        .tap(debugChangedFile(isDebugEnabled))
        .collect()
        .map(function(newerDependentVinylFiles) {
          return newerDependentVinylFiles.length > 0;
        })
        .flatMap(function(hasNewerDependingFiles) {
          return hasNewerDependingFiles
            ? highland([dependentVinylFile])
            : highland([]);
        });
    })
  );
}


function getDestAbsPath(dest, dependentVinylFile) {
  var dependentRelativePath = path.relative(dependentVinylFile.base,
                                            dependentVinylFile.path);
  var destRelativePath = dest(dependentRelativePath);
  var destAbsPath = path.resolve(dependentVinylFile.base, destRelativePath);
  return destAbsPath;
}


function composeDependentAndDependings() {
  return apply(function(srcVinylFiles, destVinylFile) {
    return highland(srcVinylFiles)
      .map(function(srcVinylFile) {
        return [srcVinylFile, destVinylFile];
      });
  });
}


function apply(fn) {
  return function(array) {
    return fn.apply(null, array);
  };
}


function newerFilesThan(comparator) {
  return apply(function(vinylFileA, vinylFileB) {
    return comparator(vinylFileA, vinylFileB);
  });
}


function compareByMtime(vinylFile, baseVinylFile) {
  return getMtime(vinylFile) > getMtime(baseVinylFile);
}


function getMtime(vinylFile) {
  return vinylFile.stat.mtime;
}


function collectDependings(matcher, pathResolver, di) {
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
      .flatMap(collectDependings(matcher, pathResolver, di))
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


function debugRelatedFiles(isEnabled, dependentVinylFile) {
  return highland.pipeline(function(srcVinylFilesStream) {
    if (isEnabled) {
      // TODO: Use fork
      srcVinylFilesStream
        .observe()
        .each(function(dependingVinylFiles) {
          console.log('Related files %j (from "%s")',
                      lodash.pluck(dependingVinylFiles, 'path'),
                      dependentVinylFile.path);
        });
    }
    return srcVinylFilesStream;
  });
}


function debugChangedFile(isEnabled) {
  return apply(function(srcVinylFile, destVinylFile) {
    if (!isEnabled) return;
    console.log('File "%s" is newer than "%s"',
                srcVinylFile.path,
                destVinylFile.path);
  });
}


module.exports = {
  createDependenciesChangedStream: createDependenciesChangedStream,
  collectDependings: collectDependings,
  compareByMtime: compareByMtime,
  relativeResolver: relativeResolver,
};
