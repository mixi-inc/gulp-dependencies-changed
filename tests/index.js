var chai = require('chai');
var assert = chai.assert;

describe('gulp-dependecies-changed', function() {
  it('should export a stream factory function', function() {
    var depsChanged = require('../index.js');

    assert.typeOf(depsChanged, 'function');
    assert.property(depsChanged(), 'pipe');
  });


  it('should export a compareByMtime function', function() {
    var depsChanged = require('../index.js');

    assert.property(depsChanged, 'compareByMtime');
  });


  it('should export a relativeResolver function', function() {
    var depsChanged = require('../index.js');

    assert.property(depsChanged, 'relativeResolver');
  });
});
