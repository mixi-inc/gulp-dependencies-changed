gulp-dependencies-changed
=========================

Smart incremental building by dependency analysis.

[![Build Status](https://travis-ci.org/Kuniwak/gulp-dependencies-changed.svg?branch=master)](https://travis-ci.org/Kuniwak/gulp-dependencies-changed)
[![npm version](https://badge.fury.io/js/gulp-dependencies-changed.svg)](http://badge.fury.io/js/gulp-dependencies-changed)



Installation
------------

```shell
npm install gulp-dependencies-changed
```


Usage
-----

```javascript
var less = require('gulp-less');
var changed = require('gulp-dependencies-changed');

gulp.task('less', function() {
  return gulp.src('./less/**/*.less')
    // Analize dependencies for less. Pass through
    // only files that its depending files are changed.
    .pipe(changed({
      matcher: /@import ['"]?([^'"]+)['"]?;/g,
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

[MIT](https://github.com/Kuniwak/gulp-dependencies-changed/blob/master/LICENSE) (c) [Kuniwak](https://github.com/Kuniwak)
