'use strict';

// Import node modules.
const https = require('https'),
	  url = require('url');

// Static varialbes.
const host = 'https://translate.google.com',
	  max_length = 200;

class GoogleSynthesis extends require('events').EventEmitter {
	/**
	 * Constructor call
	 * @param {*} getKey Whether to setup a key automaticly.
	 * @param {*} logger An object with a log and warn warn function.
	 */
	constructor(getKey = true, logger) {
		super();
		
		if (logger) {
			this.logger = logger;
		}
		
		if (getKey) {
			if (this.logger) {
				this.logger.log('Automatic key retrieval enabled.');
			}
			
			let self = this;
			this.key(function(key) {
				self._key = key;
				
				self.emit('key', key);
				
				if (self.logger) {
					self.logger.log('Aquired key: ' + key);
				}
			});
		}
	}
	/**
	 * Gets key from doing a request to the host.
	 * @param {*} callback function(key) {}
	 */
	key(callback) {
		if (!callback) {
			return;
		}
		let body = '';
		https.get(host, function(response) {
			response.setEncoding('utf8');
			response.on('error', function(error) {
				this.emit('error', error);
			});
			response.on('data', function(chunk) {
				body += chunk;
			});
			response.on('end', function() {
				if (callback) {
					callback(eval(eval(/\(\'\(.*\)\'\);/.exec(body)[0])));
				}
			});
		});
	}
	/**
	 * Combines the text and key into a token.
	 * https://github.com/zlargon/google-tts
	 * https://stackoverflow.com/a/34687566/5359600
	 * @param {*} text The text to be send off.
	 * @param {*} key The client session key.
	 */
	token(text, key) {
		let XL = function (a, b) {
			for (let c = 0; c < b.length - 2; c += 3) {
				let d = b.charAt(c + 2);
				d = d >= 'a' ? d.charCodeAt(0) - 87 : Number(d);
				d = b.charAt(c + 1) == '+' ? a >>> d : a << d;
				a = b.charAt(c) == '+' ? a + d & 4294967295 : a ^ d;
			}
			return a;
		}
		let a = text, b = key, d = b.split('.');
		b = Number(d[0]) || 0;
		let e = [],
			f = 0;
		for (let g = 0; g < a.length; g++) {
			let m = a.charCodeAt(g);
			128 > m ? e[f++] = m : (2048 > m ? e[f++] = m >> 6 | 192 : (55296 == (m & 64512) && g + 1 < a.length && 56320 == (a.charCodeAt(g + 1) & 64512) ? (m = 65536 + ((m & 1023) << 10) + (a.charCodeAt(++g) & 1023),
			e[f++] = m >> 18 | 240,
			e[f++] = m >> 12 & 63 | 128) : e[f++] = m >> 12 | 224,
			e[f++] = m >> 6 & 63 | 128),
			e[f++] = m & 63 | 128);
		}
		a = b;
		for (f = 0; f < e.length; f++) {
			a += e[f];
			a = XL(a, '+-a^+6');
		}
		a = XL(a, '+-3^+b+-f');
		a ^= Number(d[1]) || 0;
		0 > a && (a = (a & 2147483647) + 2147483648);
		a = a % 1E6;
		return a.toString() + '.' + (a ^ b);
	}
	/**
	 * Returns an array of URLs pointing to addresses where the synthesised transcript can be retrieved from.
	 * @param {*} transcript Text to be synthesised.
	 * @param {*} language Language code eg 'en-gb' or 'nl-nl' etc..
	 * @param {*} speed The playback speed with 1 being the normal.
	 * @param {*} key The key can also be explicitly given if you want to deal with it yourself.
	 */
	request(transcript, language = 'en-gb', speed = 1, key = null) {
		if (key === undefined || key === null) {
			key = this._key;
			if (key === undefined || key === null) {
				this.emit('error', 'No valid key given, use \'key()\' first to aquire one.');
				return;
			}
		}
		if (typeof transcript != typeof "") {
			this.emit('error', 'Transcript is not of type string');
			return;
		}
		
		// Helper functions for splitting the transcript.
		/**
		 * 
		 * @param {*} string 
		 * @param {*} index 
		 */
		const isSpace = function(string, index) {
			return /\s/.test(string.charAt(index));
		};
		/**
		 * 
		 * @param {*} string 
		 * @param {*} left 
		 * @param {*} right 
		 */
		const lastIndexOfSpace = function(string, left, right) {
			for (let i = right; i >= left; i--) {
				if (isSpace(string, i)) {
					return i;
				}
			}
			return -1; // not found
		};
		
		let transcriptSlices = [];
		let start = 0;
		for (;;) {
			// Check transcript's length, if less than maximum end of transcript has been reached.
			if (transcript.length - start <= max_length) {
				transcriptSlices.push(transcript.slice(start, transcript.length));
				break;
			}
			
			// Check whether the word is cut in the middle.
			let end = start + max_length - 1;
			if (isSpace(transcript, end) || isSpace(transcript, end + 1)) {
				transcriptSlices.push(transcript.slice(start, end + 1));
				start = end + 1;
				continue;
			}
			
			// Find last index of space
			end = lastIndexOfSpace(transcript, start, end);
			if (end === -1) {
				this.emit('error', 'Character count of single word is over the max length of ' + max_length + '.');
			}
			
			// Add to array
			transcriptSlices.push(transcript.slice(start, end + 1));
			start = end + 1;
		}
		
		// Construct url queries.
		let urls = [];
		for(let i = 0; i < transcriptSlices.length; i++) {
			transcript = transcriptSlices[i];
			urls.push(host + '/translate_tts' + url.format({
				query: {
					ie: 'UTF-8',
					q: transcript,
					tl: language,
					total: 1,
					idx: 0,
					textlen: transcript.length,
					tk: this.token(transcript, key.toString()),
					client: 't',
					prev: 'input',
					ttsspeed: speed.toString()
				}})
			);
		}
		return urls;
	}
};

module.exports = GoogleSynthesis;