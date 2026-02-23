/**
 * Tests for openscadLoader pure functions
 * Tests checkForProjection and WASM state management functions
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkForProjection,
  getWasmLoadState,
  getWasmLoadError,
  subscribeWasmLoadState,
  resetLoader,
} from '../services/openscadLoader';

describe('checkForProjection', () => {
  it('returns null for normal 3D code', () => {
    expect(checkForProjection('cube([10, 10, 10]);')).toBeNull();
    expect(checkForProjection('cylinder(h=20, d=10);')).toBeNull();
    expect(checkForProjection('difference() { cube(10); sphere(8); }')).toBeNull();
  });

  it('detects projection() calls', () => {
    const result = checkForProjection('projection(cut=true) cube(10);');
    expect(result).toBeTruthy();
    expect(result).toContain('not supported');
  });

  it('detects projection with whitespace', () => {
    expect(checkForProjection('projection  (')).toBeTruthy();
  });

  it('detects laser cut references', () => {
    expect(checkForProjection('// laser cut pattern')).toBeTruthy();
    expect(checkForProjection('laser cutting template')).toBeTruthy();
  });

  it('detects 2D cut/pattern/design keywords', () => {
    expect(checkForProjection('2d cut template')).toBeTruthy();
    expect(checkForProjection('2d pattern design')).toBeTruthy();
    expect(checkForProjection('2D design file')).toBeTruthy();
  });

  it('detects flatten keyword', () => {
    expect(checkForProjection('flatten the model')).toBeTruthy();
  });

  it('detects DXF references', () => {
    expect(checkForProjection('export to dxf format')).toBeTruthy();
    expect(checkForProjection('import("file.dxf")')).toBeTruthy();
  });

  it('is case insensitive', () => {
    expect(checkForProjection('PROJECTION()')).toBeTruthy();
    expect(checkForProjection('Laser Cut')).toBeTruthy();
    expect(checkForProjection('DXF')).toBeTruthy();
  });

  it('returns null for empty string', () => {
    expect(checkForProjection('')).toBeNull();
  });
});

describe('WASM state management', () => {
  beforeEach(() => {
    resetLoader();
  });

  it('initial state is idle', () => {
    expect(getWasmLoadState()).toBe('idle');
  });

  it('initial error is null', () => {
    expect(getWasmLoadError()).toBeNull();
  });

  it('subscribeWasmLoadState returns unsubscribe function', () => {
    const listener = vi.fn();
    const unsub = subscribeWasmLoadState(listener);
    expect(typeof unsub).toBe('function');
    unsub();
  });
});
