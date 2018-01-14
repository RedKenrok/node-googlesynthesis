# Google synthesis
Builds network request for [Google's translation](https://translate.google.com)'s speech synthesis API. Based of [Zlargon's 'google-tts'](https://github.com/zlargon/google-tts).

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
  true, // getKey whether to automaticly get a key.
  console // Logger used for testing purposes.
);
```

### Methods
```javascript
// Gets the url requests for getting the synthesized audio.
let urls = googleSynthesis.request('Hello world');
```

> request() returns an array of urls since it only allows for a maximum of 200 characters per request.

Various extra methods you most likely won't have to deal with

```javascript
// Gets a key from translate.google.com.
googleSynthesis.key(function(key) {
  console.log(key);
});
// Get a token directly form the text and key.
let token = googleSynthesis.token('Hello world!', key);
```

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

The following example is used in electron so the Web Audio API is available. 

```javascript
// Initialize module, see constructor section for more information.
const GoogleSynthesis = require('googlesynthesis');
const googleSynthesis = new GoogleSynthesis();

// Audio player.
const audio = new Audio();

// After this event is called the service can be used.
googleSynthesis.addEventListener('key', function(key) {
  // Get urls for the phrase 'Hello world!'.
  let urls = googleSynthesis.speak('Hello world!');
   
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

If the module suddenly stops working it might be because Google changed the method of creating the required token for each request had changed.
