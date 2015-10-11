gulp-dependencies-changed
=========================
[![Build Status](https://travis-ci.org/mixi-inc/gulp-dependencies-changed.svg?branch=master)](https://travis-ci.org/mixi-inc/gulp-dependencies-changed)
[![npm version](https://badge.fury.io/js/gulp-dependencies-changed.svg)](http://badge.fury.io/js/gulp-dependencies-changed)

Smart incremental building by dependency analysis.


Installation
------------

```shell
npm install --save-dev gulp-dependencies-changed
```


Usage
-----

```javascript
var less = require('gulp-less');
var changed = require('gulp-dependencies-changed');
var Path = require('path');
var rename = require('rename');

gulp.task('less', function() {
  return gulp.src('./less/**/*.less')
    // Analyze dependencies for less. Pass through
    // only files that its depending files are changed.
    .pipe(changed({
      matcher: /@import ['"]?([^'"]+)['"]?;/g,
      dest: function(srcRelPath, srcBasePath) {
        // It should return dest file path.
        return rename(srcPath, function(fileObj) {
          return {
            dirname: Path.join('public/css' + fileObj.dirname)
            extname: 'css',
          };
        });
      },
    }))
    .pipe(less())
    .pipe(gulp.dest('./public/css'));
});
```


API
---
### changed(options)

Only pass through dependent files that depending to changed files


#### options
##### matcher

Type: `RegExp`

This RegExp MUST include only a capturing group and SHOULD be global match.
The result of the match will be given to a `pathResolver`.


##### dest

Type: `function(string, string): string`

This function take an argument (a relative file path and the base path).
The source file path is exactly equivalent to `path.relative(vinylFile.path, vinylFile.base)`.
It SHOULD return the file path for the dest file path.
The return value is used as a target of comparison.

You can easily rename by using [rename](https://www.npmjs.com/package/rename).


##### pathResolver

Type: `function(string, string): string`

Default: `changed.relativeResolver`

This function take 2 arguments (a dependent file path, the depended file path captured by `matcher`) and MUST return a file path for the depending file.
If omitted, it takes a related file path from the dependent file.

If file extensions is omitted, you can complement the file extensions by the function.


##### comparator

Type: `function(VinylFile, VinylFile): boolean`

Default: `changed.compareByMtime`

This function take 2 arguments (a depending file and the dependent file) and it MUST return `true` when the depending is newer than the dependent file.
If omitted, it compare by the both mtime.


##### debug

Type: `boolean`

Default: `false`

Print debug messages when it is truthy.


License
-------

MIT
