/**
 * Test Suite: Dedicated Word Bar, Clean Network & Responsive Architecture
 * Validates:
 * 1. Complete drop of reconnection watchdog loops & session caching
 * 2. Complete separation of game-top-bar and dedicated game-word-bar
 * 3. Mobile vs Desktop clean responsive layouts and smooth scrolling
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== RUNNING WORD BAR, CLEAN NETWORK & RESPONSIVE SUITE ===\n');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'css/style.css'), 'utf8');
const appJs = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');
const netJs = fs.readFileSync(path.join(ROOT, 'js/network.js'), 'utf8');

// 1. Reconnection & Session Caching Dropped
console.log('1. Verifying Reconnection & Session Caching Dropped...');
assert.strictEqual(appJs.includes('function checkSessionResume'), false, 'checkSessionResume must be completely removed');
assert.ok(appJs.includes('clearSession();'), 'init() must clear any legacy sessions');
assert.ok(appJs.includes("showView('lobby');"), 'init() must always navigate cleanly to lobby');
assert.strictEqual(netJs.includes('visibilityListener = () =>'), false, 'NetworkManager must not auto-reconnect on visibility change');
assert.strictEqual(netJs.includes('onlineListener = () =>'), false, 'NetworkManager must not auto-reconnect on online event');
assert.strictEqual(netJs.includes('now - this.lastHostActivity > 15000'), false, 'Silent host 15s disconnect timer must be removed');
assert.strictEqual(netJs.includes('this.joinHandshakeInterval = setInterval'), false, 'Repeating JOIN packet handshake loop must be removed');
console.log('   ✓ Clean peer connection & session drop verified.\n');

// 2. Dedicated Word Bar DOM & Functional Separation
console.log('2. Verifying Dedicated Word Bar Separation in HTML & JS...');
assert.ok(html.includes('id="game-word-bar"'), 'HTML must declare dedicated #game-word-bar');
assert.ok(html.includes('class="game-word-bar"'), 'HTML must declare class game-word-bar');

assert.ok(appJs.includes('els.gameWordBar = document.getElementById(\'game-word-bar\')'), 'app.js must cache gameWordBar');
assert.ok(appJs.includes('function updateWordBanner'), 'app.js must provide dedicated updateWordBanner helper');
assert.ok(appJs.includes('is-drawer-banner'), 'app.js must toggle is-drawer-banner on word bar for high-contrast drawer notice');
console.log('   ✓ Dedicated Word Bar separation verified.\n');

// 3. Desktop vs Mobile CSS Responsive Architecture
console.log('3. Verifying Desktop (>900px) and Mobile (<=900px) Responsive Rules...');
assert.ok(css.includes('.game-word-bar {'), 'CSS must style base .game-word-bar');
assert.ok(css.includes('.game-word-bar.is-drawer-banner {'), 'CSS must provide high-contrast drawer banner styling');
assert.ok(css.includes('@media (min-width: 901px)'), 'CSS must define desktop boundary');
assert.ok(css.includes('@media (max-width: 900px)'), 'CSS must define mobile boundary');

// Desktop checks
const desktopSection = css.slice(css.indexOf('@media (min-width: 901px)'));
assert.ok(desktopSection.includes('grid-template-columns: 240px 1fr 300px'), 'Desktop must enforce 3-column classic Skribbl party layout');
assert.ok(desktopSection.includes('.mobile-action-btn'), 'Desktop must hide mobile header buttons');
assert.ok(desktopSection.includes('.mobile-player-ribbon'), 'Desktop must hide mobile player ribbon');
assert.ok(desktopSection.includes('min-height: 540px'), 'Desktop arena must enforce healthy min-height for smooth scrolling');

// Mobile checks
const mobileSection = css.slice(css.indexOf('@media (max-width: 600px)'));
assert.ok(mobileSection.includes('flex-wrap: nowrap'), 'Mobile phone game-top-bar must never wrap or overlap status buttons');
assert.ok(mobileSection.includes('.game-word-bar {'), 'Mobile phone must adapt dedicated game-word-bar');
assert.ok(mobileSection.includes('order: 3'), 'word-info-wrap must maintain order: 3 compatibility');

console.log('   ✓ Responsive architecture verified.\n');

console.log('🎉 ALL WORD BAR & CLEAN ARCHITECTURE TESTS PASSED! 🎉\n');
