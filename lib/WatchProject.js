const EventEmitter = require('events');
const assert = require('assert');
const watchman = require('fb-watchman');
const client = new watchman.Client();
const path = require('path');


let capable = (function verifyWatchmanCapabilities () {
	return new Promise((resolve, reject) => {

		client.capabilityCheck({ optional: [], required: ['relative_root'] }, function (error, resp) {
			
			if (error) {
				console.log(error);
				client.end();
				return reject();
			}

			resolve();
		});
	});
})();

class WatchProject extends EventEmitter {

	constructor (opts) {

		super();

		assert(opts.projectPath, 'Pass in a project directory to watch');
		assert(opts.subscriptionOpts instanceof Object, 'Pass in subscription options');


		this.directory = path.resolve(opts.projectPath);
		this.subscriptionOpts = opts.subscriptionOpts;

		this.subscriptionName = `watch_${~~(Math.random() * 1000)}`;

		this.abstractClock = opts.hasOwnProperty('abstractClock') ? opts.abstractClock : true;

		this.client = client;

		capable
		.then(this.initiateWatch.bind(this), err => console.warn(err))
		.then(() => {
			if (this.abstractClock) {
				return this.getClock();
			}
		}, err => console.warn(err))
		.then(this.subscribe.bind(this));
	} 

	initiateWatch () {
		return new Promise ((resolve, reject) => {

			this.client.command(['watch-project', this.directory], (error, resp) => {

				if (error) {
					this.emit('error', error);
					return reject(`Error initiating watch: ${error}`);
				}

				if ('warning' in resp) {
					console.log(`Warning: ${resp.warning}`);
				}

				this.emit('initialized', this.directory);

				// console.log('Watch established on ', resp.watch,' relative_path', resp.relative_path);
				this.watchProject = resp;

				resolve();
			});
		});
	}

	getClock () {
		return new Promise((resolve, reject) => {

			const { watch } = this.watchProject;

			this.client.command(['clock', watch], (error, resp) => {

				if (error) {
					this.emit('error', error);
					return reject('Failed to query clock:', error);
				}

				this.subscriptionOpts.since = resp.clock;

				resolve();
			});
		});
	}

	subscribe () {

		const { watch, relative_path: relativePath } = this.watchProject;

		if (relativePath) {
			this.subscriptionOpts.relative_root = relativePath;
		}

		this.client.command(
			['subscribe', watch, this.subscriptionName, this.subscriptionOpts],
			(error, resp) => {

				if (error) {
					this.emit('error', error);
					console.error('failed to subscribe: ', error);
					return;
				}

				this.emit('subscribed', resp);

				this.client.on('subscription', this._onChange.bind(this));
			}
		);
	}

	_onChange (resp) {

		if (resp.subscription !== this.subscriptionName) {
			return;
		}

		this.emit('change', resp);
	}
}

module.exports = WatchProject;