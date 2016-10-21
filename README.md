# gulp-watchman
Simple wrapper around Facebook's [Watchman](https://facebook.github.io/watchman/).

## Installation

```
npm install --save-dev gulp-watchman
```

## Usage

```js
const gulp = require('gulp');
const watchman = require('gulp-watchman');

gulp.task('build', function () {
	console.log('*Build logic*');
});

gulp.task('watchTask', function () {
	return watch('src', {
		expression: [
			'allof',
			['match', '*'],
			['type', 'f'],
		]
	}, ['build']);
});

// Also returns a stream
gulp.task('watchStream', function () {
	return watchman('src', {
		expression: [
			'allof',
			['match', '*'],
			['type', 'f'],
		]
	}).pipe(gulp.dest('build'));
});
```

## API

### watchman(dirPath, [options, tasks])
Watches for changes in `dirpath` and returns a Readable stream of Vinyl instances per file. The `dirPath` is **not** a glob.



#### options.logs
Type: `Boolean`
Default: `true`

Show Gulp logs or not. All of the files that are added/deleted/changed will be logged if true.

#### options.sinceInit
Type: `Boolean`
Default: `true`

Determines whether changes on all files should be triggered as soon as the Watch starts, using [since](
https://facebook.github.io/watchman/docs/cmd/since.html).

- `true`: Change events are not triggered on initialization, only when files are changed after initialization
- `false`: Triggers a change on every file that `options.expression` matched on initialization
	- Convenient when debugging expressions to see which files Watchman is listening to
	- Useful for triggering tasks immediately after initializing the Watchman task

#### options.expression
Type: `Array`
Default: `undefined`

A nested-array structure of [Expression Terms](https://facebook.github.io/watchman/docs/expr/allof.html) to filter the files Watchman should watch.

Eg. Listen to changes on all non-hidden files that are not in a `node_modules` directory
```
expression: [
	'allof',
	['match', '*'], // Non-hidden
	['type', 'f'], // Only files

	// Ignore node_modules
	['not',
		['match', 'node_modules', 'basename'],
		['match', 'node_modules/**/*', 'wholename', {includedotfiles: true}],
		['match', '*/node_modules/**/*', 'wholename', {includedotfiles: true}],
	]
]
```

## License

MIT (c) 2016 Hiroki Osame