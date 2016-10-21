const gulp = require('gulp');
const WatchProject = require('./WatchProject');
const Readable = require('stream').Readable;
const vinylFile = require('vinyl-file');
const Vinyl = require('vinyl');
const path = require('path');
const gutil = require('gulp-util');
const assert = require('assert');
const fileTypes = require('./fileTypes');

function gulpWatchman (projectPath, opts, tasks) {

	assert(typeof projectPath === 'string', 'Pass in a project path to watch');
	assert(arguments.length >= 2, 'Pass in an array of tasks to trigger on change');

	if (Array.isArray(opts)) {
		tasks = opts;
		opts = {};
	}

	const fileChangeStream = new Readable({
		objectMode: true,
		read (byteSize) {}
	});

	let watchingProject = new WatchProject({
		projectPath,
		abstractClock: opts.hasOwnProperty('abstractClock') ? opts.abstractClock : true,
		subscriptionOpts: {
			expression: opts.expression,
			fields: ['name', 'type', 'exists', 'new']
		}
	});

	watchingProject
		.on('initialized', function (projectPath) {
			gutil.log('Watchman successfully watching project', gutil.colors.cyan(projectPath));
		})
		.on('subscribed', function () {
			gutil.log('Watchman successfully subscribed to changes');
		})
		.on('change', function (event) {

			gutil.log('Watchman detected changes:');

			for (let fileObj of event.files) {

				let logMessage = fileTypes[fileObj.type] + ' ' + (fileObj.exists ? (fileObj.new ? 'added' : 'changed') : 'removed');
				let logColor = fileObj.exists ? (fileObj.new ? 'green' : 'yellow') : 'red';

				gutil.log('\t', gutil.colors[logColor](logMessage), gutil.colors.cyan(fileObj.name));

				// Vinyl only cares about files
				if (fileObj.type === 'f') {

					if (fileObj.exists) {

						let filePath = path.resolve(this.directory, fileObj.name);

						vinylFile.read(filePath)
							.then(
								file => fileChangeStream.push(file),
								err => console.warn('Warn', err)
							);
					}

					// Deleted files
					else {
						fileChangeStream.push(new Vinyl({
							path: fileObj.name
						}));
					}
				}
			}


			gulp.start(tasks);
		})
		.on('error', function (error) {
			gutil.log(gutil.colors.red('Watchman Error'), error);
			fileChangeStream.push(null);
		});

	return fileChangeStream;
};

module.exports = gulpWatchman;