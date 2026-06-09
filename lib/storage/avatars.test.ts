import { describe, it, expect } from 'vitest';
import { extFromContentType, cacheBustedUrl } from './avatars';

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

describe('cacheBustedUrl', () => {
  const base = 'https://x.supabase.co/storage/v1/object/public/avatars/u.png';

  it('appends a version query so re-uploads yield a distinct URL', () => {
    expect(cacheBustedUrl(base, 1)).toBe(`${base}?v=1`);
    expect(cacheBustedUrl(base, 2)).not.toBe(cacheBustedUrl(base, 1));
  });

  it('uses & when the url already has a query string', () => {
    expect(cacheBustedUrl('https://x/p?foo=1', 9)).toBe('https://x/p?foo=1&v=9');
  });
});
