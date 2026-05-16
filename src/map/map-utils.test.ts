import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getMapResolutionDpi,
  setMapResolutionParam,
  wmsImageLoadFunction,
} from './map-utils';

describe('getMapResolutionDpi', () => {
  let originalDpr: number;

  beforeEach(() => {
    originalDpr = window.devicePixelRatio;
  });

  afterEach(() => {
    Object.defineProperty(window, 'devicePixelRatio', {
      value: originalDpr,
      configurable: true,
    });
  });

  it('returns 96 for devicePixelRatio 1', () => {
    Object.defineProperty(window, 'devicePixelRatio', {
      value: 1,
      configurable: true,
    });
    expect(getMapResolutionDpi()).toBe(96);
  });

  it('returns 192 for devicePixelRatio 2', () => {
    Object.defineProperty(window, 'devicePixelRatio', {
      value: 2,
      configurable: true,
    });
    expect(getMapResolutionDpi()).toBe(192);
  });

  it('returns 144 for devicePixelRatio 1.5', () => {
    Object.defineProperty(window, 'devicePixelRatio', {
      value: 1.5,
      configurable: true,
    });
    expect(getMapResolutionDpi()).toBe(144);
  });
});

describe('setMapResolutionParam', () => {
  let originalDpr: number;

  beforeEach(() => {
    originalDpr = window.devicePixelRatio;
    Object.defineProperty(window, 'devicePixelRatio', {
      value: 1,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'devicePixelRatio', {
      value: originalDpr,
      configurable: true,
    });
  });

  it('appends MAP_RESOLUTION to URL without query string', () => {
    const url = 'https://example.com/wms';
    const result = setMapResolutionParam(url);
    expect(result).toMatch(/^https:\/\/example\.com\/wms\?MAP_RESOLUTION=\d+$/);
  });

  it('appends MAP_RESOLUTION with & to URL with query string', () => {
    const url = 'https://example.com/wms?SERVICE=WMS';
    const result = setMapResolutionParam(url);
    expect(result).toBe('https://example.com/wms?SERVICE=WMS&MAP_RESOLUTION=96');
  });
});

describe('wmsImageLoadFunction', () => {
  let originalDpr: number;

  beforeEach(() => {
    originalDpr = window.devicePixelRatio;
    Object.defineProperty(window, 'devicePixelRatio', {
      value: 1,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'devicePixelRatio', {
      value: originalDpr,
      configurable: true,
    });
  });

  it('sets the image src with MAP_RESOLUTION appended', () => {
    const mockImage = { getImage: vi.fn() };
    const mockImgElement = { src: '' };
    mockImage.getImage.mockReturnValue(mockImgElement);

    wmsImageLoadFunction(mockImage, 'https://example.com/wms?SERVICE=WMS');

    expect(mockImage.getImage).toHaveBeenCalled();
    expect(mockImgElement.src).toBe('https://example.com/wms?SERVICE=WMS&MAP_RESOLUTION=96');
  });
});
