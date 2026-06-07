import { describe, it, expect } from 'vitest';
import { extFromContentType } from './avatars';

describe('extFromContentType', () => {
  it('maps supported image content types to a storage extension', () => {
    expect(extFromContentType('image/png')).toBe('png');
    expect(extFromContentType('image/jpeg')).toBe('jpg');
    expect(extFromContentType('image/jpg')).toBe('jpg');
    expect(extFromContentType('image/webp')).toBe('webp');
  });

  it('is case-insensitive', () => {
    expect(extFromContentType('IMAGE/PNG')).toBe('png');
  });

  it('returns null for unsupported content types', () => {
    expect(extFromContentType('image/gif')).toBeNull();
    expect(extFromContentType('application/pdf')).toBeNull();
    expect(extFromContentType('')).toBeNull();
  });
});
