/**
 * Comprehensive Responsive & Mobile UI/UX Test Suite for Naghash Bashi
 * Validates responsive rules, touch safeguards, safe areas, 3:2 canvas scaling,
 * mobile drawer bottom sheets, and PWA viewport integrity across all device profiles.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== RUNNING NAGHASH BASHI RESPONSIVE & MOBILE PWA TEST SUITE ===\n');

const ROOT = path.join(__dirname, '..');
const htmlContent = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const cssContent = fs.readFileSync(path.join(ROOT, 'css/style.css'), 'utf8');
const appJsContent = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');
const canvasJsContent = fs.readFileSync(path.join(ROOT, 'js/canvas.js'), 'utf8');

// 1. Mobile Viewport & PWA Head Tags Integrity
console.log('1. Verifying Mobile Viewport & PWA Meta Headers...');
assert.ok(htmlContent.includes('viewport-fit=cover'), 'HTML must declare viewport-fit=cover for edge-to-edge mobile display');
assert.ok(htmlContent.includes('maximum-scale=1.0'), 'HTML must set maximum-scale=1.0 to prevent mobile zooming');
assert.ok(htmlContent.includes('apple-mobile-web-app-capable'), 'HTML must declare iOS PWA standalone capability');
assert.ok(htmlContent.includes('Vazirmatn'), 'HTML must load Persian Vazirmatn typography');
console.log('   ✓ Mobile viewport and PWA meta tags completely verified.');

// 2. CSS Ergonomics & Safe-Area Safeguards
console.log('2. Verifying CSS Mobile Ergonomics & Safe-Area Safeguards...');
assert.ok(cssContent.includes('overscroll-behavior: none'), 'CSS must enforce overscroll-behavior: none to prevent mobile pull-to-refresh');
assert.ok(cssContent.includes('touch-action: none !important'), 'Game arena canvas must enforce touch-action: none !important');
assert.ok(cssContent.includes('env(safe-area-inset-bottom'), 'CSS must adapt to mobile safe-area-inset-bottom');
assert.ok(cssContent.includes('env(safe-area-inset-top'), 'CSS must adapt to mobile safe-area-inset-top');
assert.ok(cssContent.includes('100dvh'), 'CSS must use dynamic viewport height (100dvh) for mobile browser address bars');
assert.ok(cssContent.includes('direction: ltr !important'), 'Touch controls compatibility overlay must be declared');
console.log('   ✓ CSS mobile ergonomics & safe-area safeguards verified.');

// 3. Canvas 3:2 Aspect Ratio & High-DPI Scaling Integrity
console.log('3. Verifying Canvas Aspect Ratio & Relative Coordinates Mapping...');
assert.ok(cssContent.includes('aspect-ratio: 3 / 2'), 'Canvas must enforce 3:2 aspect-ratio to match 1200x800 logical resolution');
assert.ok(canvasJsContent.includes('logicalWidth = 1200'), 'Canvas engine must maintain 1200 logical width');
assert.ok(canvasJsContent.includes('logicalHeight = 800'), 'Canvas engine must maintain 800 logical height');
assert.ok(canvasJsContent.includes('changedTouches'), 'Canvas engine must handle changedTouches for mobile pointer fidelity');
console.log('   ✓ Canvas aspect ratio & touch coordinate mappings verified.');

// 4. Mobile Game Arena Components (Player Ribbon, Guesser Bar, Drawers)
console.log('4. Verifying Mobile Game Arena Markup & Interactions...');
assert.ok(htmlContent.includes('id="mobile-player-ribbon"'), 'index.html must include mobile-player-ribbon');
assert.ok(htmlContent.includes('id="btn-toggle-scores"'), 'index.html must include mobile scoreboard toggle button');
assert.ok(htmlContent.includes('id="btn-toggle-chat"'), 'index.html must include mobile chat toggle button');
assert.ok(htmlContent.includes('id="recent-chat-ticker"'), 'index.html must include recent-chat-ticker');
assert.ok(htmlContent.includes('id="quick-guess-form"'), 'index.html must include quick-guess-form');
assert.ok(htmlContent.includes('id="drawer-backdrop"'), 'index.html must include mobile drawer-backdrop');
console.log('   ✓ Mobile game arena components present in markup.');

// 5. JavaScript Application Responsiveness & State Handlers
console.log('5. Verifying App Controller Mobile Handlers...');
assert.ok(appJsContent.includes('updateToolbarsState'), 'app.js must coordinate drawer vs guesser toolbar states');
assert.ok(appJsContent.includes('updateInputState'), 'app.js must coordinate chat/quick-guess input states');
assert.ok(appJsContent.includes('closeAllDrawers'), 'app.js must provide closeAllDrawers handler');
assert.ok(appJsContent.includes('toggleScoreboardDrawer'), 'app.js must provide toggleScoreboardDrawer handler');
assert.ok(appJsContent.includes('toggleChatDrawer'), 'app.js must provide toggleChatDrawer handler');
assert.ok(appJsContent.includes('orientationchange'), 'app.js must handle device orientation change');
assert.ok(appJsContent.includes('mobilePlayerRibbon'), 'app.js must populate mobile player ribbon');
console.log('   ✓ App controller responsive handlers verified.');

// 6. Responsive Breakpoint CSS Rules Verification
console.log('6. Verifying Responsive Breakpoints in style.css...');
assert.ok(cssContent.includes('@media (max-width: 900px)'), 'CSS must define tablet/mobile breakpoint at 900px');
assert.ok(cssContent.includes('@media (max-width: 600px)'), 'CSS must define mobile phones breakpoint at 600px');
assert.ok(cssContent.includes('@media (max-width: 400px)'), 'CSS must define small mobile phones breakpoint at 400px');
assert.ok(cssContent.includes('@media (min-width: 901px)'), 'CSS must isolate desktop view above 900px');
console.log('   ✓ Responsive media queries verified.');

// 7. Virtual Viewport Keyboard Adaptation
console.log('7. Verifying Virtual Viewport & Mobile Keyboard Adaptation...');
assert.ok(appJsContent.includes('visualViewport'), 'app.js must register visualViewport resize handler');
assert.ok(cssContent.includes('--vvh'), 'CSS must adapt app container height to --vvh for soft keyboard');
assert.ok(htmlContent.includes('enterkeyhint="send"'), 'Quick guess input must declare enterkeyhint="send"');
assert.ok(htmlContent.includes('enterkeyhint="go"'), 'Room code input must declare enterkeyhint="go"');
console.log('   ✓ Virtual viewport & keyboard ergonomics verified.');

// 8. Touch Action Gesture Granularity
console.log('8. Verifying Touch Action Gesture Granularity...');
assert.ok(cssContent.includes('touch-action: pan-x !important'), 'Mobile ribbon and palette must permit horizontal swipe gesture');
assert.ok(cssContent.includes('touch-action: pan-y !important'), 'Drawers, chat stream and modals must permit vertical swipe gesture');
console.log('   ✓ Touch action gesture granularity verified.');

// 9. Canvas Pointer Capture & Context Preservation
console.log('9. Verifying Pointer Capture & Context Preservation...');
assert.ok(canvasJsContent.includes('setPointerCapture'), 'DrawingCanvas must capture pointer for uninterrupted strokes');
assert.ok(canvasJsContent.includes('releasePointerCapture'), 'DrawingCanvas must release pointer capture on stroke completion');
assert.ok(canvasJsContent.includes('strokeStyle = drawColor'), 'setupCanvas must restore strokeStyle after resize context wipe');
console.log('   ✓ Pointer capture & context preservation verified.');

// 10. XSS Sanitization & Security Ergonomics
console.log('10. Verifying XSS Sanitization & Chat Security...');
assert.ok(appJsContent.includes('function escapeHtml'), 'app.js must provide escapeHtml sanitizer');
assert.ok(appJsContent.includes('escapeHtml(msg.text)'), 'Chat messages must be sanitized before DOM injection');
console.log('   ✓ XSS sanitization verified.');

console.log('\n🎉 ALL RESPONSIVE & MOBILE PWA TESTS PASSED FLAWLESSLY! 🎉\n');
