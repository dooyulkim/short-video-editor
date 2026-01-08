import '@testing-library/jest-dom';

// Configure React Testing Library to use React 19's act
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock HTMLCanvasElement.getContext
HTMLCanvasElement.prototype.getContext = function (contextId: string) {
  if (contextId === '2d') {
    return {
      canvas: this,
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      lineCap: 'butt',
      lineJoin: 'miter',
      miterLimit: 10,
      shadowBlur: 0,
      shadowColor: 'rgba(0, 0, 0, 0)',
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      globalAlpha: 1,
      globalCompositeOperation: 'source-over',
      font: '10px sans-serif',
      textAlign: 'start',
      textBaseline: 'alphabetic',
      direction: 'ltr',
      fillText: function () {},
      strokeText: function () {},
      measureText: function (text: string) {
        return {
          width: text.length * 10,
          actualBoundingBoxLeft: 0,
          actualBoundingBoxRight: text.length * 10,
          fontBoundingBoxAscent: 10,
          fontBoundingBoxDescent: 2,
          actualBoundingBoxAscent: 10,
          actualBoundingBoxDescent: 2,
          emHeightAscent: 10,
          emHeightDescent: 2,
          hangingBaseline: 8,
          alphabeticBaseline: 10,
          ideographicBaseline: 10,
        };
      },
      clearRect: function () {},
      fillRect: function () {},
      strokeRect: function () {},
      beginPath: function () {},
      closePath: function () {},
      moveTo: function () {},
      lineTo: function () {},
      arc: function () {},
      arcTo: function () {},
      ellipse: function () {},
      rect: function () {},
      fill: function () {},
      stroke: function () {},
      clip: function () {},
      save: function () {},
      restore: function () {},
      scale: function () {},
      rotate: function () {},
      translate: function () {},
      transform: function () {},
      setTransform: function () {},
      resetTransform: function () {},
      drawImage: function () {},
      createLinearGradient: function () {
        return {
          addColorStop: function () {},
        };
      },
      createRadialGradient: function () {
        return {
          addColorStop: function () {},
        };
      },
      createPattern: function () {
        return null;
      },
      getImageData: function () {
        return {
          data: new Uint8ClampedArray(),
          width: 0,
          height: 0,
        };
      },
      putImageData: function () {},
      createImageData: function () {
        return {
          data: new Uint8ClampedArray(),
          width: 0,
          height: 0,
        };
      },
      setLineDash: function () {},
      getLineDash: function () {
        return [];
      },
      lineDashOffset: 0,
      isPointInPath: function () {
        return false;
      },
      isPointInStroke: function () {
        return false;
      },
    } as unknown as CanvasRenderingContext2D;
  }
  return null;
};

// Mock HTMLCanvasElement.toDataURL
HTMLCanvasElement.prototype.toDataURL = function () {
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
};

