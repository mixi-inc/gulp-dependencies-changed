var chai = require('chai');
var assert = chai.assert;

describe('gulp-dependecies-changed', function() {
  it('should export a stream factory function', function() {
    var depsChanged = require('../index.js');

    assert.typeOf(depsChanged, 'function');
    assert.property(depsChanged(), 'pipe');
  });
});
