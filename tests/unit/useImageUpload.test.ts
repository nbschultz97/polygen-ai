/**
 * useImageUpload Hook Unit Tests
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useImageUpload } from '../../hooks/useImageUpload';

describe('useImageUpload', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with null image and preview', () => {
    const { result } = renderHook(() => useImageUpload());
    expect(result.current.attachedImage).toBeNull();
    expect(result.current.imagePreview).toBeNull();
  });

  it('rejects invalid file types', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const { result } = renderHook(() => useImageUpload());

    const file = new File(['data'], 'test.pdf', { type: 'application/pdf' });
    const event = {
      target: { files: [file] },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleImageUpload(event);
    });

    expect(alertSpy).toHaveBeenCalledWith(
      expect.stringContaining('valid image')
    );
    expect(result.current.attachedImage).toBeNull();
  });

  it('rejects files over 10MB', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const { result } = renderHook(() => useImageUpload());

    const file = new File(['x'], 'big.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', { value: 11 * 1024 * 1024 });

    const event = {
      target: { files: [file] },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleImageUpload(event);
    });

    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('10MB'));
  });

  it('handles empty file input', () => {
    const { result } = renderHook(() => useImageUpload());

    const event = {
      target: { files: [] },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleImageUpload(event);
    });

    expect(result.current.attachedImage).toBeNull();
  });

  it('processes valid image file', async () => {
    const { result } = renderHook(() => useImageUpload());

    // Use a class-based mock for FileReader
    const mockOnloadend: { fn: (() => void) | null } = { fn: null };
    class MockFileReader {
      result = 'data:image/png;base64,dGVzdA==';
      set onloadend(fn: () => void) {
        mockOnloadend.fn = fn;
      }
      readAsDataURL = vi.fn();
    }
    vi.stubGlobal('FileReader', MockFileReader);

    const file = new File(['test'], 'photo.png', { type: 'image/png' });
    const event = {
      target: { files: [file] },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleImageUpload(event);
    });

    // Simulate FileReader completing
    act(() => {
      mockOnloadend.fn?.();
    });

    expect(result.current.attachedImage).toEqual({
      base64: 'dGVzdA==',
      mimeType: 'image/png',
    });
    expect(result.current.imagePreview).toBe('data:image/png;base64,dGVzdA==');
  });

  it('clearAttachedImage resets state', () => {
    const { result } = renderHook(() => useImageUpload());

    const mockOnloadend: { fn: (() => void) | null } = { fn: null };
    class MockFileReader {
      result = 'data:image/jpeg;base64,abc123';
      set onloadend(fn: () => void) {
        mockOnloadend.fn = fn;
      }
      readAsDataURL = vi.fn();
    }
    vi.stubGlobal('FileReader', MockFileReader);

    const file = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });
    const event = {
      target: { files: [file] },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleImageUpload(event);
    });
    act(() => {
      mockOnloadend.fn?.();
    });

    expect(result.current.attachedImage).not.toBeNull();

    act(() => {
      result.current.clearAttachedImage();
    });

    expect(result.current.attachedImage).toBeNull();
    expect(result.current.imagePreview).toBeNull();
  });

  it('accepts valid image types: jpeg, png, webp, gif', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    for (const type of validTypes) {
      const readAsDataURL = vi.fn();
      class MockFileReader {
        result = `data:${type};base64,dGVzdA==`;
        onloadend: (() => void) | null = null;
        readAsDataURL = readAsDataURL;
      }
      vi.stubGlobal('FileReader', MockFileReader);

      const { result } = renderHook(() => useImageUpload());
      const file = new File(['test'], 'img.test', { type });
      const event = {
        target: { files: [file] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      act(() => {
        result.current.handleImageUpload(event);
      });

      expect(readAsDataURL).toHaveBeenCalled();
    }

    expect(alertSpy).not.toHaveBeenCalled();
  });
});
