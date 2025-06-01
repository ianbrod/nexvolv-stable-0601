import '@testing-library/jest-dom';
import { expect, vi, beforeAll, afterAll } from 'vitest';
import { cleanup } from '@testing-library/react';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    })
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock URL methods
global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock document methods for testing
if (typeof document !== 'undefined') {
  const originalCreateElement = document.createElement;
  document.createElement = vi.fn().mockImplementation((tag) => {
    if (tag === 'a') {
      return {
        href: '',
        download: '',
        click: vi.fn(),
        style: {}
      };
    }
    return originalCreateElement.call(document, tag);
  });

  document.body.appendChild = vi.fn();
  document.body.removeChild = vi.fn();
}

// Mock window properties needed for React DOM
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock CSS animations and transitions
Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({
    getPropertyValue: () => '',
    animationName: '',
    animationDuration: '',
    transitionDuration: '',
  }),
});

// Define window.CSS if it doesn't exist
if (!window.CSS) {
  window.CSS = {
    supports: () => false,
    escape: (str: string) => str,
  } as any;
}

// Mock ResizeObserver
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
window.ResizeObserver = ResizeObserverMock as any;

// Mock IntersectionObserver
class IntersectionObserverMock {
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }
  callback: IntersectionObserverCallback;
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn();
  root = null;
  rootMargin = '';
  thresholds = [];
}
window.IntersectionObserver = IntersectionObserverMock as any;

// Polyfill for PointerEvent required by some Radix UI components in JSDOM
// See: https://github.com/radix-ui/primitives/issues/1822
// and https://github.com/jsdom/jsdom/pull/3567
if (typeof window !== 'undefined' && !window.PointerEvent) {
  class PointerEvent extends MouseEvent {
    pointerId?: number;
    pressure?: number;
    pointerType?: string;
    width?: number;
    height?: number;
    tiltX?: number;
    tiltY?: number;
    isPrimary?: boolean;

    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
      this.pointerId = params.pointerId;
      this.pressure = params.pressure;
      this.pointerType = params.pointerType;
      this.width = params.width;
      this.height = params.height;
      this.tiltX = params.tiltX;
      this.tiltY = params.tiltY;
      this.isPrimary = params.isPrimary;
    }
  }
  window.PointerEvent = PointerEvent as any;
}

// Clean up after each test
afterAll(() => {
  cleanup();
});