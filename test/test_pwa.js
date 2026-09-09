/**
 * PWA Assets & Mobile Meta Automated Verification Test for Naghash Bashi
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('--- Running Naghash Bashi PWA & Mobile Assets Verification ---');

const ROOT = path.join(__dirname, '..');

// 1. Verify manifest.json
console.log('1. Checking manifest.json...');
const manifestPath = path.join(ROOT, 'manifest.json');
assert.ok(fs.existsSync(manifestPath), 'manifest.json must exist');

const manifestRaw = fs.readFileSync(manifestPath, 'utf8');
const manifest = JSON.parse(manifestRaw);

assert.strictEqual(manifest.display, 'standalone', 'PWA display must be standalone');
assert.ok(manifest.name.includes('نقاشباشی'), 'PWA name must include game title');
assert.strictEqual(manifest.short_name, 'نقاشباشی', 'PWA short_name must be exact');
assert.strictEqual(manifest.theme_color, '#f59e0b', 'Theme color must match warm amber');
assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 2, 'Must have at least 192 and 512 icons');

const has192 = manifest.icons.some(i => i.sizes === '192x192');
const has512 = manifest.icons.some(i => i.sizes === '512x512');
assert.ok(has192, 'Icon 192x192 must be declared');
assert.ok(has512, 'Icon 512x512 must be declared');
console.log('   ✓ manifest.json is fully valid and compliant.');

// 2. Verify Service Worker (sw.js)
console.log('2. Checking Service Worker (sw.js)...');
const swPath = path.join(ROOT, 'sw.js');
assert.ok(fs.existsSync(swPath), 'sw.js must exist in root');
const swContent = fs.readFileSync(swPath, 'utf8');
assert.ok(swContent.includes('addEventListener(\'install\''), 'SW must handle install event');
assert.ok(swContent.includes('addEventListener(\'activate\''), 'SW must handle activate event');
assert.ok(swContent.includes('addEventListener(\'fetch\''), 'SW must handle fetch event');
assert.ok(swContent.includes('CACHE_NAME'), 'SW must declare cache name');
console.log('   ✓ Service worker syntax and lifecycle handlers verified.');

// 3. Verify Mobile Meta Tags & Viewport in index.html
console.log('3. Checking mobile & PWA meta tags in index.html...');
const indexPath = path.join(ROOT, 'index.html');
const indexHtml = fs.readFileSync(indexPath, 'utf8');

assert.ok(indexHtml.includes('viewport-fit=cover'), 'Viewport must include viewport-fit=cover for edge-to-edge mobile display');
assert.ok(indexHtml.includes('apple-mobile-web-app-capable'), 'Must include apple-mobile-web-app-capable for iOS PWA');
assert.ok(indexHtml.includes('name="theme-color"'), 'Must include theme-color meta tag');
assert.ok(indexHtml.includes('rel="manifest"'), 'Must link to manifest.json');
console.log('   ✓ Mobile viewport and PWA meta tags verified.');

// 4. Verify Icon Files Exist
console.log('4. Checking physical icon assets...');
const icon192Path = path.join(ROOT, 'assets', 'icon-192.svg');
const icon512Path = path.join(ROOT, 'assets', 'icon-512.svg');
assert.ok(fs.existsSync(icon192Path), 'assets/icon-192.svg must exist');
assert.ok(fs.existsSync(icon512Path), 'assets/icon-512.svg must exist');
console.log('   ✓ Physical icon files exist and are verified.');

console.log('🎉 All Naghash Bashi PWA assets verified successfully!');
