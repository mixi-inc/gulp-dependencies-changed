var chai = require('chai');
var assert = chai.assert;
var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

var path = require('path');
var FIXTURE_DIR = path.join(__dirname, 'fixtures');

var highland = require('highland');
var lodash = require('lodash');
var vinylFs = require('vinyl-fs');
var VinylFile = require('vinyl');
var Promise = require('es6-promise').Promise;

var depsChanged = require('lib/deps_changed_stream');


describe('createDependenciesChangedStream', function() {
  var createDependenciesChangedStream = depsChanged.createDependenciesChangedStream;

  it('should return a stream', function() {
    var opts = {
      matcher: /DEPEND_TO: (.*)/g,
      comparator: depsChanged.compareByMtime,
      pathResolver: depsChanged.relativeResolver,
    };

    var stream = createDependenciesChangedStream(opts);
    assert(isStream(stream), 'Expected a Stream but got ' + typeof stream);
  });


  it('should pass when the dependent is older than the depending', function() {
    var opts = {
      matcher: /DEPEND_TO: (.*)/g,
      comparator: depsChanged.compareByMtime,
      pathResolver: depsChanged.relativeResolver,
    };

    var olderDependentVinylFile = createVinylFile({
      path: '/path/to/project/dependent',
      mtime: new Date('1999/01/01'),
      contentString: 'DEPEND_TO: ./depended',
    });

    var newerDependedVinylFile = createVinylFile({
      path: '/path/to/project/depended',
      mtime: new Date('2000/01/01'),
      contentString: '',
    });

    var stubVinylFileMap = {
      '/path/to/project/dependent': olderDependentVinylFile,
      '/path/to/project/depended': newerDependedVinylFile,
    };

    var di = {
      createVinylFileStream: function(filePath) {
        return highland([stubVinylFileMap[filePath]]);
      },
    };

    var stream = highland([olderDependentVinylFile])
      .pipe(createDependenciesChangedStream(opts, di));

    return waitUntilStreamEnd(stream, function(vinylFiles) {
      assert.sameMembers(vinylFiles, [
        olderDependentVinylFile,
      ]);
    });
  });


  it('should drop when the dependent is newer than the depending', function() {
    var opts = {
      matcher: /DEPEND_TO: (.*)/g,
      comparator: depsChanged.compareByMtime,
      pathResolver: depsChanged.relativeResolver,
    };

    var newerDependentVinylFile = createVinylFile({
      path: '/path/to/project/dependent',
      mtime: new Date('2000/01/01'),
      contentString: 'DEPEND_TO: ./depended',
    });

    var olderDependedVinylFile = createVinylFile({
      path: '/path/to/project/depended',
      mtime: new Date('1999/01/01'),
      contentString: '',
    });

    var stubVinylFileMap = {
      '/path/to/project/dependent': newerDependentVinylFile,
      '/path/to/project/depended': olderDependedVinylFile,
    };

    var di = {
      createVinylFileStream: function(filePath) {
        return highland([stubVinylFileMap[filePath]]);
      },
    };

    var stream = highland([newerDependentVinylFile])
      .pipe(createDependenciesChangedStream(opts, di));

    return waitUntilStreamEnd(stream, function(vinylFiles) {
      assert.sameMembers(vinylFiles, []);
    });
  });
});


describe('compareByMtime', function() {
  var compareByMtime = depsChanged.compareByMtime;

  it('should return true when the first vinyl file is newer than the other', function() {
    var newerVinylFile = createVinylFile({ mtime: new Date('2000/01/01') });
    var olderVinylFile = createVinylFile({ mtime: new Date('1999/01/01') });

    assert.isTrue(compareByMtime(newerVinylFile, olderVinylFile));
  });


  it('should return false when the first vinyl file is older than the other', function() {
    var newerVinylFile = createVinylFile({ mtime: new Date('2000/01/01') });
    var olderVinylFile = createVinylFile({ mtime: new Date('1999/01/01') });

    assert.isTrue(compareByMtime(newerVinylFile, olderVinylFile));
  });


  it('should return false when the both vinyl files have same mtime', function() {
    var vinylFile1 = createVinylFile({ mtime: new Date('2000/01/01') });
    var vinylFile2 = createVinylFile({ mtime: new Date('2000/01/01') });

    assert.isFalse(compareByMtime(vinylFile1, vinylFile2));
  });
});


describe('collectDepending', function() {
  var collectDepending = depsChanged.collectDepending;
  var matcher = /@depend ([.\w\/]+)/g;


  it('should return depending vinyl-files', function() {
    var stream = createFixtureVinylFileStream('child')
      .flatMap(collectDepending(matcher, relativeResolver));

    return waitUntilStreamEnd(stream, function(dependingVinylFiles) {
      var dependingFilePaths = lodash.pluck(dependingVinylFiles, 'path');

      assert.sameMembers(dependingFilePaths, [
        getFixturePath('parent'),
      ]);
    });
  });


  it('should return depending vinyl-files recursively', function() {
    var stream = createFixtureVinylFileStream('grand_child')
      .flatMap(collectDepending(matcher, relativeResolver));

    return waitUntilStreamEnd(stream, function(dependingVinylFiles) {
      var dependingFilePaths = lodash.pluck(dependingVinylFiles, 'path');

      assert.sameMembers(dependingFilePaths, [
        getFixturePath('parent'),
        getFixturePath('child'),
      ]);
    });
  });
});


function relativeResolver(dependentFilePath, dependedFilePath) {
  return path.resolve(path.dirname(dependentFilePath), dependedFilePath);
}


function waitUntilStreamEnd(stream, fn) {
  return new Promise(function(onFulfilled, onRejected) {
    highland(stream)
    .errors(function(error) {
      onRejected(error);
    })
    .toArray(function(files) {
      try {
        fn(files);
        onFulfilled();
      }
      catch (err) {
        onRejected(err);
      }
    });
  });
}


function getFixturePath(fileName) {
  return path.join(FIXTURE_DIR, fileName);
}


function createFixtureVinylFileStream(fileName) {
  return highland(vinylFs.src(getFixturePath(fileName)));
}


function createVinylFile(opts) {
  return new VinylFile({
    path: opts.path || 'path/to/file',
    contents: new Buffer(opts.contentString || 'CONTENTS'),
    stat: { mtime: opts.mtime || new Date('2000/01/01') },
  });
}


function isStream(obj) {
  return obj && typeof obj.pipe === 'function';
}
