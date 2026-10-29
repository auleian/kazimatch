import { describe, expect, it } from 'vitest';
import { normalizeUrl, safeUrl, shortUrl } from './validation';

describe('portfolio links', () => {
  it('adds https:// when the scheme is missing', () => {
    expect(normalizeUrl(' behance.net/amara ')).toBe('https://behance.net/amara');
    expect(normalizeUrl('http://example.com')).toBe('http://example.com');
    expect(normalizeUrl('')).toBe('');
  });

  it('only allows plain web links', () => {
    expect(safeUrl('https://github.com/amara')).toBe('https://github.com/amara');
    expect(safeUrl('javascript:alert(1)')).toBeNull();
    expect(safeUrl('https://localhost')).toBeNull();
    expect(safeUrl('not a url')).toBeNull();
    expect(safeUrl(undefined)).toBeNull();
  });

  it('shortens links for display', () => {
    expect(shortUrl('https://www.behance.net/amara/')).toBe('behance.net/amara');
  });
});
