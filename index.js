'use strict';

// Import node modules.
const https = require('https'),
	  url = require('url');

// Static varialbes.
const host = 'https://www.google.com/speech-api/v1/synthesize',
	  hostTranslate = 'https://translate.google.com';

/**
 * Combines the text and key into a token.
 * https://github.com/zlargon/google-tts
 * https://stackoverflow.com/a/34687566/5359600
 * @param {*} text The text to be send off.
 * @param {*} key The client session key.
 */
const token = function(text, key) {
	if (typeof key != 'string') {
		key = key.toString();
	}
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

class GoogleSynthesis extends require('events').EventEmitter {
	/**
	 * Constructor call
	 * @param {*} logger An object with a log and warn warn function.
	 */
	constructor(logger) {
		super();
		
		if (logger) {
			this.logger = logger;
		}
	}
	/**
	 * Slices a string at spaces if it exeeds the maximum length.
	 * @param {*} transcript Text to be sliced.
	 * @param {*} length Maxium length of one section, default 200.
	 */
	slice(transcript, length = 200) {
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
			if (transcript.length - start <= length) {
				transcriptSlices.push(transcript.slice(start, transcript.length));
				break;
			}
			
			// Check whether the word is cut in the middle.
			let end = start + length - 1;
			if (isSpace(transcript, end) || isSpace(transcript, end + 1)) {
				transcriptSlices.push(transcript.slice(start, end + 1));
				start = end + 1;
				continue;
			}
			
			// Find last index of space
			end = lastIndexOfSpace(transcript, start, end);
			if (end === -1) {
				this.emit('error', 'Character count of single word is over the max length of ' + length + '.');
			}
			
			// Add to array
			transcriptSlices.push(transcript.slice(start, end + 1));
			start = end + 1;
		}
		return transcriptSlices;
	}
	/**
	 * Use the Google Web Speech API V1.
	 * Returns an array of URLs pointing to addresses where the synthesised transcript can be retrieved from.
	 * @param {*} transcript Text to be synthesised.
	 * @param {*} language Language code, default 'en-GB'.
	 * @param {*} voice Name of the voice to be used, default 'Uk English Female'.
	 * @param {*} pitch Pitch, default 0.5.
	 * @param {*} speed Playback speed, default 0.5.
	 * @param {*} volume Volume, default 1.
	 */
	request(transcript, language = 'en-GB', voice = 'UK English Female', pitch = 0.5, speed = 0.5, volume = 1) {
		// Split transcript up.
		let transcriptSlices = this.slice(transcript, 500);
		// Url queries.
		let urls = [];
		for(let i = 0; i < transcriptSlices.length; i++) {
			transcript = transcriptSlices[i];
			// Build and add url to list.
			urls.push(host + url.format({
				query: {
					ie: 'UTF-8',
					lang: language,
					voice: voice,
					pitch: pitch,
					speed: speed,
					vol: volume,
					text: transcript
				}
			}));
		}
		// Return urls.
		return urls;
	}
	/**
	 * Use the Google Translate's text to speech API.
	 * Returns an array of URLs pointing to addresses where the synthesised transcript can be retrieved from.
	 * @param {*} transcript Text to be synthesised.
	 * @param {*} language Language code, default 'en-GB'.
	 * @param {*} speed Playback speed, default 1.
	 * @param {*} key Key to create tokes, optional.
	 */
	requestTranslate(transcript, language = 'en-GB', speed = 1, key = null) {
		if (typeof transcript !== 'string') {
			this.emit('error', 'Transcript is not of type string');
			return;
		}
		// Get a key if possible.
		if (key === undefined || key === null) {
			key = this._key;
		}
		else if (this._key === undefined || this._key === null) {
			this._key = key;
		}
		
		// Split transcript up.
		let transcriptSlices = this.slice(transcript, 200);
		// Url queries.
		let urls = [];
		let query;
		for(let i = 0; i < transcriptSlices.length; i++) {
			transcript = transcriptSlices[i];
			// Create query data.
			query = {
				ie: 'UTF-8',
				q: transcript,
				tl: language,
				total: 1,
				idx: 0,
				textlen: transcript.length,
				client: 't',
				prev: 'input',
				ttsspeed: speed
			};
			// If key is available add it to the query.
			if (key === undefined || key === null) {
				query.tk = token(transcript, key);
			}
			// Build and add url to list.
			urls.push(hostTranslate + '/translate_tts' + url.format(query));
		}
		// Return urls.
		return urls;
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
		https.get(hostTranslate, function(response) {
			response.setEncoding('utf8');
			response.on('error', function(error) {
				this.emit('error', error);
			});
			response.on('data', function(chunk) {
				body += chunk;
			});
			response.on('end', function() {
				this._key = eval(eval(/\(\'\(.*\)\'\);/.exec(body)[0]));
				if (this.logger) {
					logger.log('Google Translate Key: ', this._key);
				}
				callback(this._key);
			});
		});
	}
};

module.exports = GoogleSynthesis;