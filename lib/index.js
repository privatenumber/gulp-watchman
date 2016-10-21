const gulp = require('gulp');
const WatchProject = require('./WatchProject');
const Readable = require('stream').Readable;
const vinylFile = require('vinyl-file');
const Vinyl = require('vinyl');
const path = require('path');
const gutil = require('gulp-util');
const assert = require('assert');
const fileTypes = require('./fileTypes');

function gulpWatchman (projectPath, opts = {}, tasks = []) {

	assert(typeof projectPath === 'string', 'Pass in a project path to watch');

	if (Array.isArray(opts)) {
		tasks = opts;
		opts = {};
	}

	const fileChangeStream = new Readable({
		objectMode: true,
		read (byteSize) {}
	});

	const watchingProject = new WatchProject({
		projectPath,
		abstractClock: opts.hasOwnProperty('sinceInit') ? opts.sinceInit : true,
		subscriptionOpts: {
			expression: opts.expression,
			fields: ['name', 'type', 'exists', 'new']
		}
	});

	opts.logs = opts.hasOwnProperty('logs') ? opts.logs : true;

	watchingProject
		.on('initialized', function (projectPath) {

			if (opts.logs) {
				gutil.log('Watchman successfully watching project', gutil.colors.cyan(projectPath));
			}
		})
		.on('subscribed', function () {

			if (opts.logs) {
				gutil.log('Watchman successfully subscribed to changes');
			}
		})
		.on('change', function (event) {

			if (opts.logs) {
				gutil.log('Watchman detected changes:');
			}

			for (let fileObj of event.files) {

				let logMessage = fileTypes[fileObj.type] + ' ' + (fileObj.exists ? (fileObj.new ? 'added' : 'changed') : 'removed');
				let logColor = fileObj.exists ? (fileObj.new ? 'green' : 'yellow') : 'red';

				if (opts.logs) {
					gutil.log('\t', gutil.colors[logColor](logMessage), gutil.colors.cyan(fileObj.name));
				}

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

			// Trigger tasks
			if (tasks.length > 0) {
				gulp.start(tasks);
			}
		})
		.on('error', function (error) {
			gutil.log(gutil.colors.red('Watchman Error'), error);
			fileChangeStream.push(null);
		});

	return fileChangeStream;
};

module.exports = gulpWatchman;