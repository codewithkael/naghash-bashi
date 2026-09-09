const assert = require('assert');
const { DrawingCanvas } = require('../js/canvas.js');

console.log('--- Testing Canvas History, Remote Sync, Undo & Scanline Fill ---');

// Create mock HTML5 Canvas and 2D Context
function createMockCanvas() {
  const width = 1200;
  const height = 800;
  const buffer = new Uint8ClampedArray(width * height * 4);

  // Initialize white
  for (let i = 0; i < buffer.length; i += 4) {
    buffer[i] = 255;
    buffer[i + 1] = 255;
    buffer[i + 2] = 255;
    buffer[i + 3] = 255;
  }

  const ctx = {
    fillStyle: '#ffffff',
    strokeStyle: '#000000',
    lineWidth: 1,
    lineCap: 'round',
    lineJoin: 'round',
    beginPath() {},
    arc() {},
    fill() {},
    stroke() {},
    moveTo() {},
    lineTo() {},
    fillRect(x, y, w, h) {
      for (let i = 0; i < buffer.length; i += 4) {
        buffer[i] = 255;
        buffer[i + 1] = 255;
        buffer[i + 2] = 255;
        buffer[i + 3] = 255;
      }
    },
    getImageData(x, y, w, h) {
      return { data: new Uint8ClampedArray(buffer) };
    },
    putImageData(imgData, x, y) {
      buffer.set(imgData.data);
    }
  };

  const canvas = {
    width,
    height,
    getContext: () => ctx,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 600, height: 400 }),
    addEventListener: () => {}
  };

  return { canvas, ctx, buffer };
}

// 1. Initialize DrawingCanvas
const { canvas, ctx } = createMockCanvas();
const drawing = new DrawingCanvas(canvas, { isInteractive: false });

assert.strictEqual(drawing.history.length, 0);
console.log('✓ DrawingCanvas initialized.');

// 2. Receive remote stroke sequence: START -> MOVE -> END
drawing.applyRemoteAction({
  type: 'STROKE_START',
  rx: 0.2,
  ry: 0.2,
  color: '#ef4444',
  size: 8
});

drawing.applyRemoteAction({
  type: 'STROKE_MOVE',
  from: { rx: 0.2, ry: 0.2 },
  to: { rx: 0.5, ry: 0.5 },
  color: '#ef4444',
  size: 8
});

drawing.applyRemoteAction({
  type: 'STROKE_END'
});

assert.strictEqual(drawing.history.length, 1, 'Remote stroke must be committed to history on STROKE_END');
assert.strictEqual(drawing.history[0].type, 'STROKE');
assert.strictEqual(drawing.history[0].color, '#ef4444');
assert.strictEqual(drawing.history[0].points.length, 2);
console.log('✓ Remote strokes correctly recorded in history stack on receiver.');

// 3. Receive remote flood fill
drawing.applyRemoteAction({
  type: 'FILL',
  rx: 0.1,
  ry: 0.1,
  color: '#3b82f6'
});

assert.strictEqual(drawing.history.length, 2);
assert.strictEqual(drawing.history[1].type, 'FILL');
console.log('✓ Remote fill correctly recorded in history.');

// 4. Remote UNDO
drawing.applyRemoteAction({
  type: 'UNDO'
});

assert.strictEqual(drawing.history.length, 1, 'UNDO must pop the last action from history');
assert.strictEqual(drawing.history[0].type, 'STROKE', 'Remaining action must be the stroke');
console.log('✓ Remote UNDO correctly updates history on receiver.');

// 5. Canvas Resize / Orientation Change must NOT wipe history!
drawing.setupCanvas();
assert.strictEqual(drawing.history.length, 1, 'setupCanvas must preserve history!');
console.log('✓ setupCanvas preserves history and redraws instead of wiping canvas.');

console.log('🎉 All Canvas History & Undo tests passed successfully!');
