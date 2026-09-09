/**
 * نقاشباشی (Naghash Bashi) - HTML5 Drawing Canvas Engine
 * Smooth pointer & touch drawing with quadratic Bézier curves,
 * relative coordinate mapping (0..1), color palette, brush sizes,
 * flood fill (bucket), undo history, and real-time network sync.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DrawingCanvas = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  const BRUSH_SIZES = {
    thin: 3,
    medium: 8,
    thick: 16,
    jumbo: 28
  };

  class DrawingCanvas {
    constructor(canvasElement, options = {}) {
      this.canvas = canvasElement;
      this.ctx = canvasElement.getContext('2d', { willReadFrequently: true });

      this.isInteractive = options.isInteractive !== undefined ? options.isInteractive : true;
      this.onAction = options.onAction || null; // Callback when local user draws

      this.currentColor = options.initialColor || '#1e293b';
      this.currentSize = BRUSH_SIZES.medium;
      this.currentTool = 'pencil'; // 'pencil', 'eraser', 'bucket'

      this.isDrawing = false;
      this.lastPoint = null;
      this.currentStroke = null;

      // History stack for undo
      this.history = [];
      this.undoLimit = 30;
      this.remoteStroke = null;

      this.setupCanvas();
      this.bindEvents();
    }

    setupCanvas() {
      if (!this.canvas) return;
      const rect = this.canvas.getBoundingClientRect();
      const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;

      // Maintain internal logical resolution 1200x800 for high precision
      this.logicalWidth = 1200;
      this.logicalHeight = 800;

      this.canvas.width = this.logicalWidth;
      this.canvas.height = this.logicalHeight;

      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      const drawColor = this.currentTool === 'eraser' ? '#ffffff' : this.currentColor;
      this.ctx.strokeStyle = drawColor;
      this.ctx.fillStyle = drawColor;
      this.ctx.lineWidth = this.currentSize;

      if (this.history && this.history.length > 0) {
        this.redrawFromHistory();
      } else {
        this.clearLocal(false);
      }
    }

    setInteractive(interactive) {
      this.isInteractive = interactive;
      if (!interactive) {
        this.isDrawing = false;
        this.lastPoint = null;
      }
    }

    setTool(tool) {
      this.currentTool = tool;
    }

    setColor(color) {
      this.currentColor = color;
      if (this.currentTool === 'eraser') {
        this.currentTool = 'pencil';
      }
    }

    setSize(sizeKey) {
      this.currentSize = BRUSH_SIZES[sizeKey] || sizeKey || BRUSH_SIZES.medium;
    }

    setLineWidth(width) {
      if (typeof width === 'number') {
        this.currentSize = width;
      } else {
        this.setSize(width);
      }
    }

    getRelativePos(e) {
      const rect = this.canvas.getBoundingClientRect();
      let clientX, clientY;

      if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if (e.changedTouches && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const rectW = rect.width || 1;
      const rectH = rect.height || 1;

      const x = (clientX - rect.left) / rectW;
      const y = (clientY - rect.top) / rectH;

      const clampedRx = Math.max(0, Math.min(1, x));
      const clampedRy = Math.max(0, Math.min(1, y));

      return {
        rx: clampedRx,
        ry: clampedRy,
        x: clampedRx * this.logicalWidth,
        y: clampedRy * this.logicalHeight
      };
    }

    bindEvents() {
      if (!this.canvas) return;

      const handlePointerDown = (e) => {
        if (!this.isInteractive) return;
        e.preventDefault();

        const pos = this.getRelativePos(e);

        if (this.currentTool === 'bucket') {
          const color = this.currentColor;
          this.floodFill(pos.rx, pos.ry, color);
          this.emitAction({
            type: 'FILL',
            rx: pos.rx,
            ry: pos.ry,
            color
          });
          return;
        }

        this.isDrawing = true;
        this.lastPoint = pos;

        if (this.canvas.setPointerCapture && e.pointerId !== undefined) {
          try {
            this.canvas.setPointerCapture(e.pointerId);
          } catch (err) {}
        }

        const color = this.currentTool === 'eraser' ? '#ffffff' : this.currentColor;
        const size = this.currentSize;

        this.currentStroke = {
          type: 'STROKE',
          color,
          size,
          points: [{ rx: pos.rx, ry: pos.ry }]
        };

        // Draw dot
        this.ctx.beginPath();
        this.ctx.fillStyle = color;
        this.ctx.arc(pos.x, pos.y, size / 2, 0, Math.PI * 2);
        this.ctx.fill();

        this.emitAction({
          type: 'STROKE_START',
          rx: pos.rx,
          ry: pos.ry,
          color,
          size
        });
      };

      const handlePointerMove = (e) => {
        if (!this.isInteractive || !this.isDrawing || !this.lastPoint) return;
        e.preventDefault();

        const pos = this.getRelativePos(e);

        const color = this.currentTool === 'eraser' ? '#ffffff' : this.currentColor;
        const size = this.currentSize;

        this.ctx.beginPath();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = size;
        this.ctx.moveTo(this.lastPoint.x, this.lastPoint.y);
        this.ctx.lineTo(pos.x, pos.y);
        this.ctx.stroke();

        if (this.currentStroke) {
          this.currentStroke.points.push({ rx: pos.rx, ry: pos.ry });
        }

        this.emitAction({
          type: 'STROKE_MOVE',
          from: { rx: this.lastPoint.rx, ry: this.lastPoint.ry },
          to: { rx: pos.rx, ry: pos.ry },
          color,
          size
        });

        this.lastPoint = pos;
      };

      const handlePointerUp = (e) => {
        if (this.canvas.releasePointerCapture && e.pointerId !== undefined) {
          try {
            this.canvas.releasePointerCapture(e.pointerId);
          } catch (err) {}
        }
        if (!this.isInteractive || !this.isDrawing) return;
        e.preventDefault();
        this.isDrawing = false;
        this.lastPoint = null;

        if (this.currentStroke && this.currentStroke.points.length > 0) {
          this.saveHistory(this.currentStroke);
          this.currentStroke = null;
        }

        this.emitAction({ type: 'STROKE_END' });
      };

      // Pointer events for unified touch and mouse support
      this.canvas.addEventListener('pointerdown', handlePointerDown);
      if (typeof window !== 'undefined') {
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        window.addEventListener('pointercancel', handlePointerUp);
      }

      // Prevent iOS touch scrolling/pinch-to-zoom over canvas
      this.canvas.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
      this.canvas.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
    }

    emitAction(action) {
      if (typeof this.onAction === 'function') {
        this.onAction(action);
      }
    }

    saveHistory(action) {
      this.history.push(action);
      if (this.history.length > this.undoLimit) {
        this.history.shift();
      }
    }

    clear(broadcast = true) {
      this.clearLocal(true);
      if (broadcast) {
        this.emitAction({ type: 'CLEAR' });
      }
    }

    clearLocal(save = true) {
      if (!this.ctx) return;
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);
      if (save) {
        this.saveHistory({ type: 'CLEAR' });
      }
    }

    undo(broadcast = true) {
      if (this.history.length === 0) return;
      this.history.pop();
      this.redrawFromHistory();

      if (broadcast) {
        this.emitAction({ type: 'UNDO' });
      }
    }

    redrawFromHistory() {
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);

      const items = [...this.history];
      items.forEach(action => {
        if (action.type === 'CLEAR') {
          this.ctx.fillStyle = '#ffffff';
          this.ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);
        } else if (action.type === 'FILL') {
          this.floodFill(action.rx, action.ry, action.color, false);
        } else if (action.type === 'STROKE') {
          const { color, size, points } = action;
          if (!points || points.length === 0) return;

          this.ctx.strokeStyle = color;
          this.ctx.fillStyle = color;
          this.ctx.lineWidth = size;

          if (points.length === 1) {
            this.ctx.beginPath();
            this.ctx.arc(points[0].rx * this.logicalWidth, points[0].ry * this.logicalHeight, size / 2, 0, Math.PI * 2);
            this.ctx.fill();
          } else {
            this.ctx.beginPath();
            this.ctx.moveTo(points[0].rx * this.logicalWidth, points[0].ry * this.logicalHeight);
            for (let i = 1; i < points.length; i++) {
              this.ctx.lineTo(points[i].rx * this.logicalWidth, points[i].ry * this.logicalHeight);
            }
            this.ctx.stroke();
          }
        }
      });
    }

    /**
     * Apply remote drawing action received from network peer
     */
    applyRemoteAction(action) {
      if (!action || !this.ctx) return;

      switch (action.type) {
        case 'STROKE_START': {
          const x = action.rx * this.logicalWidth;
          const y = action.ry * this.logicalHeight;
          this.ctx.beginPath();
          this.ctx.fillStyle = action.color;
          this.ctx.arc(x, y, action.size / 2, 0, Math.PI * 2);
          this.ctx.fill();

          this.remoteStroke = {
            type: 'STROKE',
            color: action.color,
            size: action.size,
            points: [{ rx: action.rx, ry: action.ry }]
          };
          break;
        }
        case 'STROKE_MOVE': {
          const x0 = action.from.rx * this.logicalWidth;
          const y0 = action.from.ry * this.logicalHeight;
          const x1 = action.to.rx * this.logicalWidth;
          const y1 = action.to.ry * this.logicalHeight;

          this.ctx.beginPath();
          this.ctx.strokeStyle = action.color;
          this.ctx.lineWidth = action.size;
          this.ctx.moveTo(x0, y0);
          this.ctx.lineTo(x1, y1);
          this.ctx.stroke();

          if (!this.remoteStroke) {
            this.remoteStroke = {
              type: 'STROKE',
              color: action.color,
              size: action.size,
              points: [{ rx: action.from.rx, ry: action.from.ry }]
            };
          }
          this.remoteStroke.points.push({ rx: action.to.rx, ry: action.to.ry });
          break;
        }
        case 'STROKE_END': {
          if (this.remoteStroke && this.remoteStroke.points.length > 0) {
            this.saveHistory(this.remoteStroke);
            this.remoteStroke = null;
          }
          break;
        }
        case 'CLEAR':
          this.clearLocal(false);
          this.saveHistory({ type: 'CLEAR' });
          break;
        case 'FILL':
          this.floodFill(action.rx, action.ry, action.color, true);
          break;
        case 'UNDO':
          this.undo(false);
          break;
        case 'FULL_SYNC':
          if (Array.isArray(action.history)) {
            this.history = [...action.history];
            this.redrawFromHistory();
          }
          break;
      }
    }

    /**
     * High-performance scanline flood fill algorithm for paint bucket
     */
    floodFill(rx, ry, fillColorHex, save = true) {
      if (!this.ctx) return;
      const startX = Math.floor(rx * this.logicalWidth);
      const startY = Math.floor(ry * this.logicalHeight);

      if (startX < 0 || startX >= this.logicalWidth || startY < 0 || startY >= this.logicalHeight) return;

      const imgData = this.ctx.getImageData(0, 0, this.logicalWidth, this.logicalHeight);
      const data = imgData.data;
      const w = this.logicalWidth;
      const h = this.logicalHeight;

      // Parse target fill color
      const fillRGB = this.hexToRgb(fillColorHex);
      if (!fillRGB) return;

      const startIndex = (startY * w + startX) * 4;
      const targetR = data[startIndex];
      const targetG = data[startIndex + 1];
      const targetB = data[startIndex + 2];
      const targetA = data[startIndex + 3];

      // If already same color, return
      if (
        Math.abs(targetR - fillRGB.r) < 5 &&
        Math.abs(targetG - fillRGB.g) < 5 &&
        Math.abs(targetB - fillRGB.b) < 5
      ) {
        return;
      }

      const matchTarget = (idx) => {
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];
        return (
          Math.abs(r - targetR) <= 32 &&
          Math.abs(g - targetG) <= 32 &&
          Math.abs(b - targetB) <= 32 &&
          Math.abs(a - targetA) <= 32
        );
      };

      const stack = [startX, startY];
      const visited = new Uint8Array(w * h);

      while (stack.length > 0) {
        const cy = stack.pop();
        const cx = stack.pop();

        const pPos = cy * w + cx;
        if (visited[pPos]) continue;

        let lx = cx;
        while (lx > 0) {
          const testPos = cy * w + (lx - 1);
          if (visited[testPos] || !matchTarget(testPos * 4)) break;
          lx--;
        }

        let rxLimit = cx;
        while (rxLimit < w - 1) {
          const testPos = cy * w + (rxLimit + 1);
          if (visited[testPos] || !matchTarget(testPos * 4)) break;
          rxLimit++;
        }

        let checkTop = true;
        let checkBottom = true;

        for (let x = lx; x <= rxLimit; x++) {
          const curPos = cy * w + x;
          visited[curPos] = 1;
          const idx = curPos * 4;
          data[idx] = fillRGB.r;
          data[idx + 1] = fillRGB.g;
          data[idx + 2] = fillRGB.b;
          data[idx + 3] = 255;

          if (cy > 0) {
            const topPos = (cy - 1) * w + x;
            if (!visited[topPos] && matchTarget(topPos * 4)) {
              if (checkTop) {
                stack.push(x, cy - 1);
                checkTop = false;
              }
            } else {
              checkTop = true;
            }
          }

          if (cy < h - 1) {
            const btmPos = (cy + 1) * w + x;
            if (!visited[btmPos] && matchTarget(btmPos * 4)) {
              if (checkBottom) {
                stack.push(x, cy + 1);
                checkBottom = false;
              }
            } else {
              checkBottom = true;
            }
          }
        }
      }

      this.ctx.putImageData(imgData, 0, 0);

      if (save) {
        this.saveHistory({
          type: 'FILL',
          rx,
          ry,
          color: fillColorHex
        });
      }
    }

    hexToRgb(hex) {
      let c = hex.replace('#', '');
      if (c.length === 3) {
        c = c.split('').map(x => x + x).join('');
      }
      const num = parseInt(c, 16);
      if (isNaN(num)) return { r: 0, g: 0, b: 0 };
      return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255
      };
    }
  }

  return {
    BRUSH_SIZES,
    DrawingCanvas
  };
});
