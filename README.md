# Google synthesis
Builds network request for Google Speech API V1 or [Google's translation](https://translate.google.com)'s speech synthesis API. Based of [Zlargon's 'google-tts'](https://github.com/zlargon/google-tts).

## Installation
```
npm install --save googlesynthesis
```

## Usage

### Constructor
```javascript
// Import module.
const GoogleSynthesis = require('googlesynthesis');
// Create an instance.
const googleSynthesis = new GoogleSynthesis(
  console // Logger used for developing purposes, optional.
);
```

### Methods
```javascript
// Gets the url requests for getting the synthesized audio.
let urls = googleSynthesis.request(
	'Hello world', // Text to be synthesised.
	'en-GB', // Language code, default 'en-GB'.
	'UK English Female', // Name of the voice to be used, default 'Uk English Female'.
	0.5, // Pitch, default 0.5.
	0.5, // Playback speed, default 0.5.
	1 // Volume, default 1.
	);
```

> Returns an array of urls since it only allows for a maximum of 500 characters per request.

```javascript
// Gets the url requests for getting the synthesized audio, using the translate API.
let urls = googleSynthesis.requestTranslate(
	'Hello world', // Text to be synthesised.
	'en-GB', // Language code, default 'en-GB'.
	'1' // Playback speed, default 1.
	);
```

> Returns an array of urls since it only allows for a maximum of 200 characters per request.
> To see which languages are supported see the [Google Cloud documentation](https://cloud.google.com/speech/docs/languages).

Various extra methods you most likely won't have to deal with

```javascript
// Slices transcript into sections.
let slices = googleSynthesis.slice('Hello world', 8);
console.log(slices);

// Gets a key from translate.google.com.
googleSynthesis.key(function(key) {
  console.log(key);
});
```

> Result of slices will be: ['Hello','world!']

### Events
```javascript
// Emitted when an error occured.
googleSynthesis.addEventListener('error', function(error) {
  console.error('Error', error);
});
// If you have set getKey to true in the constructor,
// then this event will emit when it has retrieved one.
googleSynthesis.addEventListener('key', function(key) {
  console.log('key', key);
});
```

### Example

The following example is made for electron so the Web Audio API is available. 

```javascript
// Initialize module, see constructor section for more information.
const GoogleSynthesis = require('googlesynthesis');
const googleSynthesis = new GoogleSynthesis();

// Audio player.
const audio = new Audio();

// After this event is called the service can be used.
googleSynthesis.addEventListener('key', function(key) {
  // Get urls for the phrase 'Hello world!'.
  let urls = googleSynthesis.request('Hello world!');
   
  // Setup listener so it cycles through playing each url.
  let index = 0;
  audio.addEventListener('ended', function() {
    index++;
    if (index >= urls.length) {
      audio.removeEventListener('event', this);
	  return;
    }
    audio.src = urls[index];
    audio.play();
  });
  // Set first source.
  audio.src = urls[index];
  audio.play();
});
```

> For another example see the [Electron-VoiceInterfaceBoilerplate](https://github.com/RedKenrok/Electron-VoiceInterfaceBoilerplate)'s output.js.

## Troubleshooting

If the module suddenly stops working it might be because of several reasons
* If you are using 'request()', you might have exceeded the maximum number of request to the speech API. You currently can't increase this limit.
* If you are using 'requestTranslate()', Google changed the method of creating the required token for each request had changed.
