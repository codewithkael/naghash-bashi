const http = require('http');
const assert = require('assert');

// Start server
require('../server.js');

const endpoints = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/words.js',
  '/js/room_logic.js',
  '/js/canvas.js',
  '/js/network.js',
  '/js/audio.js',
  '/js/bot.js',
  '/js/confetti.js',
  '/js/profanity.js',
  '/manifest.json',
  '/sw.js',
  '/assets/icon-192.svg',
  '/assets/icon-512.svg'
];

let checked = 0;

endpoints.forEach(url => {
  http.get(`http://localhost:3000${url}`, res => {
    assert.strictEqual(res.statusCode, 200, `Expected 200 for ${url}`);
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log(`✓ Endpoint ${url} verified (Status 200, ${data.length} bytes)`);
      checked++;
      if (checked === endpoints.length) {
        console.log('🎉 Server static routing fully verified!');
        process.exit(0);
      }
    });
  }).on('error', err => {
    console.error(`Failed request to ${url}:`, err);
    process.exit(1);
  });
});
